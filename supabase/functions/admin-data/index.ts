import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
  "https://cardtrain.com",
  "https://cardtrain.net",
  "https://www.cardtrain.com",
  "https://www.cardtrain.net",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsHeaders = (origin: string) => {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── 號碼池初始化邏輯（Edge Function 內部使用，繞過 RLS）──
async function initializeSlotPool(
  supabaseAdmin: any,
  productId: number,
  totalSlots: number,
  prizes: Array<{ id: string; name: string; quantity: number; rarity: string; minRemaining?: number | null; marketPrice?: number | null }>
): Promise<void> {
  // 1. 清空舊的號碼池
  await supabaseAdmin.from('draw_slots').delete().eq('product_id', productId);

  // 2. 建立號碼池：1~totalSlots
  const allNumbers = Array.from({ length: totalSlots }, (_, i) => i + 1);
  
  // 3. 隨機打亂號碼
  const shuffledNumbers = [...allNumbers].sort(() => Math.random() - 0.5);

  // 4. 分配獎品號碼
  const slots: Array<{
    product_id: number;
    slot_number: number;
    prize_id: string | null;
    prize_name: string | null;
    prize_rarity: string | null;
    prize_market_price: number | null;
    prize_min_remaining: number | null;
    is_drawn: boolean;
  }> = [];

  let currentIndex = 0;

  for (const prize of prizes) {
    for (let i = 0; i < prize.quantity; i++) {
      if (currentIndex >= totalSlots) break;
      
      slots.push({
        product_id: productId,
        slot_number: shuffledNumbers[currentIndex],
        prize_id: prize.id,
        prize_name: prize.name,
        prize_rarity: prize.rarity,
        prize_market_price: prize.marketPrice || null,
        prize_min_remaining: prize.minRemaining || null,
        is_drawn: false,
      });
      
      currentIndex++;
    }
  }

  // 剩餘號碼為未中獎號碼
  for (let i = currentIndex; i < totalSlots; i++) {
    slots.push({
      product_id: productId,
      slot_number: shuffledNumbers[i],
      prize_id: null,
      prize_name: null,
      prize_rarity: null,
      prize_market_price: null,
      prize_min_remaining: null,
      is_drawn: false,
    });
  }

  // 5. 批量插入號碼池
  const { error } = await supabaseAdmin.from('draw_slots').insert(slots);
  if (error) throw error;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "請求過於頻繁，請稍後再試" }), {
      status: 429,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "缺少 action 參數" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 驗證管理員身份 ──
    const validateAdmin = async (adminId: string): Promise<boolean> => {
      if (!adminId || typeof adminId !== "string" || adminId.length < 10) return false;
      const { data } = await supabaseAdmin.from("admins").select("id").eq("id", adminId).maybeSingle();
      return !!data;
    };

    // ── 新增完整福袋（含號碼池初始化）──
    if (action === "add_full_product") {
      const { adminId, productData, prizes, totalSlots } = body;
      if (!await validateAdmin(adminId)) {
        return new Response(JSON.stringify({ error: "未授權的管理員操作" }), {
          status: 403,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      // 1. 插入 product
      const { data: insertedProduct, error: productError } = await supabaseAdmin
        .from("products")
        .insert(productData)
        .select()
        .single();
      if (productError) throw productError;

      // 2. 插入 prizes
      if (prizes && prizes.length > 0) {
        const prizesToInsert = prizes.map((p: any) => ({
          ...p,
          product_id: insertedProduct.id,
        }));
        const { error: prizesError } = await supabaseAdmin.from("prizes").insert(prizesToInsert);
        if (prizesError) throw prizesError;
      }

      // 3. 初始化號碼池
      await initializeSlotPool(supabaseAdmin, insertedProduct.id, totalSlots, prizes || []);

      return new Response(JSON.stringify({ success: true, product: insertedProduct }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // ── 管理福袋/商品 ──
    if (action === "manage_products") {
      const { adminId, operation, productData, productId } = body;
      if (!await validateAdmin(adminId)) {
        return new Response(JSON.stringify({ error: "未授權的管理員操作" }), {
          status: 403,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      if (operation === "add") {
        const { data, error } = await supabaseAdmin.from("products").insert(productData).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, product: data }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      } else if (operation === "update") {
        const { error } = await supabaseAdmin.from("products").update(productData).eq("id", productId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      } else if (operation === "delete") {
        const { error: prizeError } = await supabaseAdmin.from("prizes").delete().eq("product_id", productId);
        if (prizeError) throw prizeError;
        const { error } = await supabaseAdmin.from("products").delete().eq("id", productId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
    }

    // ── 管理獎品 ──
    if (action === "manage_prizes") {
      const { adminId, operation, prizes, productId } = body;
      if (!await validateAdmin(adminId)) {
        return new Response(JSON.stringify({ error: "未授權的管理員操作" }), {
          status: 403,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      if (operation === "replace") {
        await supabaseAdmin.from("prizes").delete().eq("product_id", productId);
        if (prizes && prizes.length > 0) {
          const { error } = await supabaseAdmin.from("prizes").insert(prizes);
          if (error) throw error;
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
    }

    // ── 管理分類 ──
    if (action === "manage_categories") {
      const { adminId, operation, categoryData, categoryId } = body;
      if (!await validateAdmin(adminId)) {
        return new Response(JSON.stringify({ error: "未授權的管理員操作" }), {
          status: 403,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      if (operation === "add") {
        const { data, error } = await supabaseAdmin.from("categories").insert(categoryData).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, category: data }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      } else if (operation === "update") {
        const { error } = await supabaseAdmin.from("categories").update(categoryData).eq("id", categoryId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      } else if (operation === "delete") {
        const { error } = await supabaseAdmin.from("categories").delete().eq("id", categoryId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
    }

    // ── 管理商城商品 ──
    if (action === "manage_shop_products") {
      const { adminId, operation, productData, productId } = body;
      if (!await validateAdmin(adminId)) {
        return new Response(JSON.stringify({ error: "未授權的管理員操作" }), {
          status: 403,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      if (operation === "add") {
        const { data, error } = await supabaseAdmin.from("shop_products").insert(productData).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, product: data }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      } else if (operation === "update") {
        const { error } = await supabaseAdmin.from("shop_products").update(productData).eq("id", productId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      } else if (operation === "delete") {
        const { error } = await supabaseAdmin.from("shop_products").update({ is_active: false }).eq("id", productId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
    }

    // ── 更新發貨狀態 ──
    if (action === "update_shipping") {
      const { adminId, recordIds, status, trackingNumber } = body;
      if (!await validateAdmin(adminId)) {
        return new Response(JSON.stringify({ error: "未授權的管理員操作" }), {
          status: 403,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const updates = recordIds.map((recordId: string) => ({
        record_id: recordId,
        status,
        shipped_time: status === "shipped" ? now : null,
        tracking_number: status === "shipped" ? trackingNumber : null,
      }));

      const { error } = await supabaseAdmin.from("shipping_status").upsert(updates);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // ── 更新商城訂單 ──
    if (action === "update_shop_order") {
      const { adminId, orderId, status, trackingNumber } = body;
      if (!await validateAdmin(adminId)) {
        return new Response(JSON.stringify({ error: "未授權的管理員操作" }), {
          status: 403,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === "shipped") {
        updateData.shipped_at = new Date().toISOString();
        if (trackingNumber) updateData.tracking_number = trackingNumber;
      }
      const { error } = await supabaseAdmin.from("shop_orders").update(updateData).eq("id", orderId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // ── 管理庫存 ──
    if (action === "manage_inventory") {
      const { adminId, productId, newRemaining, operatorName, quantity, logAction } = body;
      if (!await validateAdmin(adminId)) {
        return new Response(JSON.stringify({ error: "未授權的管理員操作" }), {
          status: 403,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabaseAdmin.from("products").update({ remaining: newRemaining }).eq("id", productId);
      if (updateError) throw updateError;

      if (logAction && quantity && operatorName) {
        const { data: product } = await supabaseAdmin.from("products").select("name").eq("id", productId).maybeSingle();
        await supabaseAdmin.from("inventory_logs").insert({
          product_id: productId,
          product_name: product?.name || "",
          action: logAction,
          quantity,
          operator: operatorName,
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `未知的 action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("admin-data error:", err);
    return new Response(JSON.stringify({ error: err.message || "操作失敗" }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
