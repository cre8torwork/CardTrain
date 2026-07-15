import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcryptjs from 'npm:bcryptjs@2';

// Rate limiting: max attempts per IP in a rolling window
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }
  entry.count++;
  return true;
}

function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitMap, 300_000);

const ALLOWED_ORIGINS = [
  'https://cardtrain.com',
  'https://cardtrain.net',
  'https://www.cardtrain.com',
  'https://www.cardtrain.net',
  'http://localhost:5173',
  'http://localhost:5174',
];

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  let origin = ALLOWED_ORIGINS[0];
  if (requestOrigin && ALLOWED_ORIGINS.some(o => requestOrigin === o || requestOrigin.startsWith(o.replace(/\/$/, '')))) {
    origin = requestOrigin;
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

interface AdminLoginRequest {
  action: 'login' | 'change_password' | 'create_admin' | 'delete_admin' | 'list_admins' | 'update_mfa';
  username?: string;
  password?: string;
  newPassword?: string;
  adminId?: string;
  mfa_secret?: string;
  mfa_enabled?: boolean;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body: AdminLoginRequest = await req.json();
    const { action } = body;

    // ── LOGIN with rate limiting ──
    if (action === 'login') {
      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      
      if (!checkRateLimit(clientIp)) {
        return new Response(JSON.stringify({ error: '嘗試次數過多，請稍後再試' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { username, password } = body;
      if (!username || !password) {
        return new Response(JSON.stringify({ error: '缺少帳號或密碼' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Sanitize input - only allow alphanumeric and basic symbols
      const sanitizedUsername = username.trim().slice(0, 50);
      if (!/^[a-zA-Z0-9_\-\.@]+$/.test(sanitizedUsername)) {
        return new Response(JSON.stringify({ error: '帳號或密碼錯誤' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: admin, error: queryError } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('username', sanitizedUsername)
        .maybeSingle();

      if (queryError || !admin) {
        // Constant-time comparison to prevent username enumeration
        await bcryptjs.compare(password, '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
        return new Response(JSON.stringify({ error: '帳號或密碼錯誤' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if password is bcrypt or plaintext (migration support)
      let passwordValid = false;
      if (admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$')) {
        passwordValid = await bcryptjs.compare(password, admin.password_hash);
      } else {
        // Legacy plaintext - re-hash automatically
        passwordValid = admin.password_hash === password;
        if (passwordValid) {
          const newHash = bcryptjs.hashSync(password, 10);
          await supabaseAdmin.from('admins')
            .update({ password_hash: newHash, updated_at: new Date().toISOString() })
            .eq('id', admin.id);
        }
      }

      if (!passwordValid) {
        return new Response(JSON.stringify({ error: '帳號或密碼錯誤' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update last login
      await supabaseAdmin.from('admins')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', admin.id);

      return new Response(JSON.stringify({
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role || '',
          mfa_enabled: admin.mfa_enabled || false,
          mfa_secret: admin.mfa_enabled ? admin.mfa_secret : null,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CHANGE PASSWORD ──
    if (action === 'change_password') {
      const { adminId, newPassword } = body;
      if (!adminId || !newPassword) {
        return new Response(JSON.stringify({ error: '缺少必要參數' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return new Response(JSON.stringify({ error: '密碼不符合複雜性要求（至少8位，包含大小寫字母和數字）' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newHash = bcryptjs.hashSync(newPassword, 10);
      const { error: updateError } = await supabaseAdmin
        .from('admins')
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', adminId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CREATE ADMIN ──
    if (action === 'create_admin') {
      const { username, password } = body;
      if (!username || !password) {
        return new Response(JSON.stringify({ error: '缺少帳號或密碼' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sanitizedUsername = username.trim().slice(0, 50);
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(sanitizedUsername)) {
        return new Response(JSON.stringify({ error: '帳號名稱只能包含英文字母、數字、底線、連字號和點號' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return new Response(JSON.stringify({ error: '密碼不符合複雜性要求' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existing } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('username', sanitizedUsername)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: '此帳號名稱已存在' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newHash = bcryptjs.hashSync(password, 10);
      const { error: insertError } = await supabaseAdmin
        .from('admins')
        .insert({
          username: sanitizedUsername,
          password_hash: newHash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DELETE ADMIN ──
    if (action === 'delete_admin') {
      const { adminId } = body;
      if (!adminId) {
        return new Response(JSON.stringify({ error: '缺少 adminId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── LIST ADMINS (without password_hash) ──
    if (action === 'list_admins') {
      const { data: admins, error: listError } = await supabaseAdmin
        .from('admins')
        .select('id, username, mfa_enabled, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (listError) throw listError;

      return new Response(JSON.stringify({ success: true, admins }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── UPDATE MFA ──
    if (action === 'update_mfa') {
      const { adminId, mfa_secret, mfa_enabled } = body;
      if (!adminId) {
        return new Response(JSON.stringify({ error: '缺少 adminId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (mfa_secret !== undefined) updateData.mfa_secret = mfa_secret;
      if (mfa_enabled !== undefined) updateData.mfa_enabled = mfa_enabled;

      const { error: updateError } = await supabaseAdmin
        .from('admins')
        .update(updateData)
        .eq('id', adminId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Admin auth error:', err);
    return new Response(JSON.stringify({ error: err.message || '伺服器錯誤' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
