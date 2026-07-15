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

// IP-based rate limiting
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

// ──── 原子化扣除積分：查詢餘額 + 寫入 在同一個 CTE 中完成 ────
async function atomicDeduct(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  type: string,
  description: string,
  idempotencyKey?: string
): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0) return { success: false, error: "扣除金額必須大於 0" };
  if (amount > 500000) return { success: false, error: "單次扣除上限為 500,000 CTP" };

  if (idempotencyKey) {
    const { data: existing } = await supabaseAdmin
      .from("points")
      .select("id")
      .eq("description", idempotencyKey)
      .maybeSingle();
    if (existing) return { success: true };
  }

  const pointId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: rpcError } = await supabaseAdmin.rpc("atomic_deduct_points", {
    p_id: pointId,
    p_user_id: userId,
    p_amount: -amount,
    p_type: type,
    p_description: description,
    p_created_at: now,
  });

  if (rpcError) {
    if (rpcError.message?.includes("insufficient") || rpcError.message?.includes("餘額不足")) {
      return { success: false, error: "積分餘額不足" };
    }
    throw rpcError;
  }

  return { success: true };
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

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let authenticatedUserId: string | null = null;
    
    if (jwt) {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
      if (!userError && user) {
        authenticatedUserId = user.id;
      }
    }

    // ──── 兌換卡片為積分（原子化操作） ────
    if (action === "redeem_cards") {
      if (!authenticatedUserId) {
        return new Response(JSON.stringify({ error: "未登入，請先登入" }), {
          status: 401,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const { recordIds } = body;

      if (!Array.isArray(recordIds) || recordIds.length === 0 || recordIds.length > 50) {
        return new Response(JSON.stringify({ error: "無效的兌換請求，每次最多 50 張卡片" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      for (const rid of recordIds) {
        if (typeof rid !== "string" || rid.length < 10) {
          return new Response(JSON.stringify({ error: "無效的兌換記錄 ID" }), {
            status: 400,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
      }

      const { data: records, error: fetchError } = await supabaseAdmin
        .from("draw_records")
        .select("id, user_id, redeemed_for_points, is_win, market_value, rarity")
        .in("id", recordIds);

      if (fetchError) throw fetchError;
      if (!records || records.length !== recordIds.length) {
        return new Response(JSON.stringify({ error: "部分兌換記錄不存在" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const POINTS_PER_CARD = 5;

      for (const record of records) {
        if (record.user_id !== authenticatedUserId) {
          return new Response(JSON.stringify({ error: "兌換記錄不屬於當前用戶" }), {
            status: 403,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
        if (record.redeemed_for_points) {
          return new Response(JSON.stringify({ error: "部分卡片已被兌換" }), {
            status: 409,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
      }

      let totalPoints = 0;
      for (const record of records) {
        if (record.is_win) {
          totalPoints += (record.market_value && record.market_value > 0) ? record.market_value : POINTS_PER_CARD;
        } else {
          totalPoints += POINTS_PER_CARD;
        }
      }

      const pointId = crypto.randomUUID();
      const now = new Date().toISOString();
      const prizeCount = records.filter((r: any) => r.is_win).length;
      const nakedCount = records.filter((r: any) => !r.is_win).length;
      let description = "";
      if (prizeCount > 0 && nakedCount > 0) {
        description = `卡片換分：獎品 ${prizeCount} 件 + 裸卡 ${nakedCount} 張`;
      } else if (prizeCount > 0) {
        description = `卡片換分：獎品 ${prizeCount} 件`;
      } else {
        description = `卡片換分：裸卡 ${nakedCount} 張`;
      }

      const { error: insertError } = await supabaseAdmin
        .from("points")
        .insert({
          id: pointId,
          user_id: authenticatedUserId,
          type: "redeem",
          amount: totalPoints,
          description,
          created_at: now,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabaseAdmin
        .from("draw_records")
        .update({ redeemed_for_points: true })
        .in("id", recordIds);

      if (updateError) {
        await supabaseAdmin.from("points").delete().eq("id", pointId);
        throw updateError;
      }

      return new Response(JSON.stringify({
        success: true,
        totalPoints,
        redeemedCount: recordIds.length,
      }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // ──── 原子化扣除積分 ────
    if (action === "deduct_points") {
      if (!authenticatedUserId) {
        return new Response(JSON.stringify({ error: "未登入，請先登入" }), {
          status: 401,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const { amount, type, description, idempotencyKey } = body;

      if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
        return new Response(JSON.stringify({ error: "無效的扣除金額" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      if (amount > 500000) {
        return new Response(JSON.stringify({ error: "單次扣除上限為 500,000 CTP" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const safeType = (type === "draw" || type === "shop" || type === "shipping") ? type : "draw";
      const safeDesc = (description && typeof description === "string")
        ? description.substring(0, 200)
        : "扣除積分";

      if (idempotencyKey && typeof idempotencyKey === "string") {
        const { data: existing } = await supabaseAdmin
          .from("points")
          .select("id")
          .eq("description", idempotencyKey)
          .maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({ success: true, alreadyProcessed: true }), {
            status: 200,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
      }

      const pointId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { data: balanceData, error: balanceError } = await supabaseAdmin
        .from("points")
        .select("amount")
        .eq("user_id", authenticatedUserId);

      if (balanceError) throw balanceError;

      const currentBalance = (balanceData || []).reduce(
        (sum: number, row: { amount: number }) => sum + row.amount, 0
      );

      if (currentBalance < amount) {
        return new Response(JSON.stringify({
          success: false,
          error: "積分餘額不足",
          currentBalance,
          required: amount,
        }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const { error: insertError } = await supabaseAdmin
        .from("points")
        .insert({
          id: pointId,
          user_id: authenticatedUserId,
          type: safeType,
          amount: -amount,
          description: idempotencyKey || safeDesc,
          created_at: now,
        });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({
        success: true,
        newBalance: currentBalance - amount,
      }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // ──── 初始化積分記錄 ────
    if (action === "add_initial_points") {
      if (!authenticatedUserId) {
        return new Response(JSON.stringify({ error: "未登入" }), {
          status: 401,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const { data: existingPoints } = await supabaseAdmin
        .from("points")
        .select("id")
        .eq("user_id", authenticatedUserId)
        .limit(1);

      if (existingPoints && existingPoints.length > 0) {
        return new Response(JSON.stringify({ success: true, alreadyExists: true }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const pointId = crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin
        .from("points")
        .insert({
          id: pointId,
          user_id: authenticatedUserId,
          type: "initial",
          amount: 0,
          description: "初始積分",
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // ──── 商城下單（原子化：檢查庫存 + 扣積分 + 建立訂單） ────
    if (action === "place_shop_order") {
      if (!authenticatedUserId) {
        return new Response(JSON.stringify({ error: "未登入，請先登入" }), {
          status: 401,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const { cartItems, shippingInfo } = body;

      if (!Array.isArray(cartItems) || cartItems.length === 0 || cartItems.length > 30) {
        return new Response(JSON.stringify({ error: "無效的購物車，最多 30 件商品" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      for (const item of cartItems) {
        if (!item.productId || typeof item.productId !== "string") {
          return new Response(JSON.stringify({ error: "無效的商品 ID" }), {
            status: 400,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
        if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 99) {
          return new Response(JSON.stringify({ error: "商品數量必須在 1-99 之間" }), {
            status: 400,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
        if (typeof item.unitPrice !== "number" || item.unitPrice <= 0) {
          return new Response(JSON.stringify({ error: "無效的商品價格" }), {
            status: 400,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
      }

      if (!shippingInfo || typeof shippingInfo !== "object") {
        return new Response(JSON.stringify({ error: "缺少收貨資訊" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const totalPoints = cartItems.reduce(
        (sum: number, item: any) => sum + item.unitPrice * item.quantity, 0
      );

      if (totalPoints <= 0 || totalPoints > 1000000) {
        return new Response(JSON.stringify({ error: "訂單金額異常" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const productIds = cartItems.map((item: any) => item.productId);
      const { data: products, error: productError } = await supabaseAdmin
        .from("shop_products")
        .select("id, stock, is_active")
        .in("id", productIds);

      if (productError) throw productError;
      if (!products || products.length !== productIds.length) {
        return new Response(JSON.stringify({ error: "部分商品不存在" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      for (const product of products) {
        const cartItem = cartItems.find((item: any) => item.productId === product.id);
        if (!product.is_active) {
          return new Response(JSON.stringify({ error: `商品 "${cartItem?.productName || product.id}" 已下架` }), {
            status: 400,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
        if (product.stock < (cartItem?.quantity || 0)) {
          return new Response(JSON.stringify({ error: `商品 "${cartItem?.productName || product.id}" 庫存不足` }), {
            status: 400,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
      }

      const { data: balanceData, error: balanceError } = await supabaseAdmin
        .from("points")
        .select("amount")
        .eq("user_id", authenticatedUserId);

      if (balanceError) throw balanceError;

      const currentBalance = (balanceData || []).reduce(
        (sum: number, row: { amount: number }) => sum + row.amount, 0
      );

      if (currentBalance < totalPoints) {
        return new Response(JSON.stringify({
          success: false,
          error: "積分餘額不足",
          currentBalance,
          required: totalPoints,
        }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const orderId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error: orderError } = await supabaseAdmin
        .from("shop_orders")
        .insert({
          id: orderId,
          user_id: authenticatedUserId,
          total_points: totalPoints,
          status: "pending",
          recipient_name: (shippingInfo.recipientName || "").substring(0, 100),
          phone: (shippingInfo.phone || "").substring(0, 30),
          flat_floor: (shippingInfo.flatFloor || "").substring(0, 100),
          building: (shippingInfo.building || "").substring(0, 100),
          address: (shippingInfo.address || "").substring(0, 200),
          district: (shippingInfo.district || "").substring(0, 100),
          notes: (shippingInfo.notes || "").substring(0, 500),
          created_at: now,
        });

      if (orderError) throw orderError;

      const orderItems = cartItems.map((item: any) => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: (item.productName || "").substring(0, 200),
        product_image: (item.productImage || "").substring(0, 500),
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("shop_order_items")
        .insert(orderItems);

      if (itemsError) {
        await supabaseAdmin.from("shop_orders").delete().eq("id", orderId);
        throw itemsError;
      }

      const pointId = crypto.randomUUID();
      const { error: pointsError } = await supabaseAdmin
        .from("points")
        .insert({
          id: pointId,
          user_id: authenticatedUserId,
          type: "shop",
          amount: -totalPoints,
          description: `商城購物 (訂單 ${orderId.substring(0, 8)})`,
          created_at: now,
        });

      if (pointsError) {
        await supabaseAdmin.from("shop_order_items").delete().eq("order_id", orderId);
        await supabaseAdmin.from("shop_orders").delete().eq("id", orderId);
        throw pointsError;
      }

      for (const item of cartItems) {
        const product = products.find((p: any) => p.id === item.productId);
        if (product) {
          const newStock = Math.max(0, product.stock - item.quantity);
          await supabaseAdmin
            .from("shop_products")
            .update({ stock: newStock })
            .eq("id", item.productId);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        orderId,
        totalPoints,
        newBalance: currentBalance - totalPoints,
      }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `未知的 action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("user-points error:", err);
    return new Response(JSON.stringify({ error: err.message || "操作失敗，請稍後再試" }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});