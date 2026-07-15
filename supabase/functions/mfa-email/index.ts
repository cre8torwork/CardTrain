import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationEmail(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  console.log("sendVerificationEmail called, to:", to, "apiKey length:", RESEND_API_KEY.length);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Card Train <noreply@cardtrain.net>",
        to: [to],
        subject: "Card Train - 您的雙重認證驗證碼",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #e11d48; font-size: 24px; margin: 0;">Card Train</h1>
            </div>
            <div style="background: #fff1f2; border-radius: 12px; padding: 24px; text-align: center;">
              <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">您的雙重認證驗證碼：</p>
              <div style="font-size: 36px; font-weight: 700; color: #e11d48; letter-spacing: 8px; padding: 12px; background: white; border-radius: 8px; margin-bottom: 16px;">
                ${code}
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">此驗證碼將在 5 分鐘後失效</p>
            </div>
            <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px;">
              如果您沒有嘗試登入 Card Train，請忽略此郵件。
            </p>
          </div>
        `,
      }),
    });

    console.log("Resend API response status:", response.status);
    if (!response.ok) {
      const body = await response.text();
      console.error("Resend API error response:", body);
      return { success: false, error: `Resend API error: ${response.status} - ${body}` };
    }
    return { success: true };
  } catch (e) {
    console.error("Resend send error:", e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ⛔ CORS: 允許所有常見來源
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  // 寬鬆策略：允許所有 readdy.ai 子域名 + 自訂域名 + localhost
  const allowed = (
    origin.endsWith(".readdy.ai") ||
    origin === "https://readdy.ai" ||
    origin === "https://cardtrain.net" ||
    origin === "https://www.cardtrain.net" ||
    origin.startsWith("http://localhost:")
  );
  const allowedOrigin = allowed ? origin : "https://cardtrain.net";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight — 回 200 方便瀏覽器讀取
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, code } = await req.json();
    console.log("mfa-email action:", action);

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "未授權" }), { status: 401, headers: corsHeaders });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ success: false, error: "未授權" }), { status: 401, headers: corsHeaders });
    }

    const userId = user.id;
    const email = user.email || "";
    console.log("User:", userId, "email:", email);

    if (action === "send_code") {
      // Check Resend API key
      if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY is not configured");
        return new Response(JSON.stringify({ success: false, error: "郵件服務未配置 (RESEND_API_KEY missing)" }), { status: 500, headers: corsHeaders });
      }

      // Generate code
      const newCode = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

      // Delete old codes
      const { error: deleteError } = await supabase.from("mfa_codes").delete().eq("user_id", userId);
      if (deleteError) console.error("Delete old codes error:", deleteError);

      // Insert new code
      const { error: insertError } = await supabase.from("mfa_codes").insert({
        user_id: userId,
        code: newCode,
        expires_at: expiresAt,
      });

      if (insertError) {
        console.error("Insert code error:", insertError);
        return new Response(JSON.stringify({ success: false, error: "無法產生驗證碼" }), { status: 500, headers: corsHeaders });
      }

      // Send email
      const emailResult = await sendVerificationEmail(email, newCode);
      console.log("Email result:", emailResult);

      if (!emailResult.success) {
        // Clean up code if email failed
        await supabase.from("mfa_codes").delete().eq("user_id", userId);
        return new Response(JSON.stringify({ success: false, error: emailResult.error || "寄送驗證郵件失敗" }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, message: "驗證碼已寄出" }), { headers: corsHeaders });
    }

    if (action === "verify_code") {
      if (!code || code.length !== 6) {
        return new Response(JSON.stringify({ success: false, error: "請輸入 6 位驗證碼" }), { status: 400, headers: corsHeaders });
      }

      // Look up the code
      const { data: mfaData, error: mfaError } = await supabase
        .from("mfa_codes")
        .select("*")
        .eq("user_id", userId)
        .eq("code", code)
        .maybeSingle();

      if (mfaError || !mfaData) {
        return new Response(JSON.stringify({ success: false, error: "驗證碼不正確" }), { status: 400, headers: corsHeaders });
      }

      // Check expiry
      if (new Date(mfaData.expires_at) < new Date()) {
        await supabase.from("mfa_codes").delete().eq("id", mfaData.id);
        return new Response(JSON.stringify({ success: false, error: "驗證碼已過期，請重新獲取" }), { status: 400, headers: corsHeaders });
      }

      // Code is valid - delete it
      await supabase.from("mfa_codes").delete().eq("id", mfaData.id);

      return new Response(JSON.stringify({ success: true, message: "驗證成功" }), { headers: corsHeaders });
    }

    if (action === "toggle_mfa") {
      const { data: userData } = await supabase
        .from("users")
        .select("mfa_enabled")
        .eq("id", userId)
        .maybeSingle();

      const newState = !(userData?.mfa_enabled ?? false);

      const { error: updateError } = await supabase
        .from("users")
        .update({ mfa_enabled: newState })
        .eq("id", userId);

      if (updateError) {
        return new Response(JSON.stringify({ success: false, error: "更新失敗" }), { status: 500, headers: corsHeaders });
      }

      if (!newState) {
        await supabase.from("mfa_codes").delete().eq("user_id", userId);
      }

      return new Response(JSON.stringify({ success: true, mfa_enabled: newState }), { headers: corsHeaders });
    }

    if (action === "get_status") {
      const { data: userData } = await supabase
        .from("users")
        .select("mfa_enabled")
        .eq("id", userId)
        .maybeSingle();

      return new Response(JSON.stringify({ success: true, mfa_enabled: userData?.mfa_enabled ?? false }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: false, error: "未知操作" }), { status: 400, headers: corsHeaders });
  } catch (e: any) {
    console.error("mfa-email unhandled error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message || "伺服器錯誤" }), { status: 500, headers: corsHeaders });
  }
});
