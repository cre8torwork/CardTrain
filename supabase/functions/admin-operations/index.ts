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

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
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

    // ── 調整積分 ──
    if (action === "adjust_points") {
      const { userId, amount, description } = body;

      if (!userId || typeof userId !== "string" || userId.length < 10) {
        return new Response(JSON.stringify({ error: "無效的用戶 ID" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      if (typeof amount !== "number" || !Number.isInteger(amount) || amount === 0) {
        return new Response(JSON.stringify({ error: "積分數量必須是非零整數" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      if (Math.abs(amount) > 100000) {
        return new Response(JSON.stringify({ error: "單次調整上限為 ±100,000 CTP" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const safeDescription = (description && typeof description === "string")
        ? description.substring(0, 200)
        : (amount > 0 ? "管理員手動增加積分" : "管理員手動扣除積分");

      const pointId = crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin
        .from("points")
        .insert({
          id: pointId,
          user_id: userId,
          amount: amount,
          type: amount > 0 ? "admin_add" : "admin_deduct",
          description: safeDescription,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, pointId }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // ── 切換用戶狀態 ──
    if (action === "toggle_user_status") {
      const { userId, newStatus } = body;

      if (!userId || typeof userId !== "string" || userId.length < 10) {
        return new Response(JSON.stringify({ error: "無效的用戶 ID" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      if (newStatus !== "active" && newStatus !== "suspended") {
        return new Response(JSON.stringify({ error: "無效的狀態值，僅接受 active 或 suspended" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ status: newStatus })
        .eq("id", userId);

      if (updateError) throw updateError;

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
    console.error("admin-operations error:", err);
    return new Response(JSON.stringify({ error: err.message || "操作失敗" }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});