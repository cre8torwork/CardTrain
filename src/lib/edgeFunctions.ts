// Edge Function URLs - centralized for security and maintainability
const SUPABASE_FUNCTIONS_BASE = 'https://cdsrzczbnbhlmiebxzfb.supabase.co/functions/v1';

export const EDGE_FUNCTIONS = {
  adminAuth: `${SUPABASE_FUNCTIONS_BASE}/admin-auth`,
  adminOperations: `${SUPABASE_FUNCTIONS_BASE}/admin-operations`,
  adminData: `${SUPABASE_FUNCTIONS_BASE}/admin-data`,
  deleteUser: `${SUPABASE_FUNCTIONS_BASE}/delete-user`,
  updateSiteSettings: `${SUPABASE_FUNCTIONS_BASE}/update-site-settings`,
  userPoints: `${SUPABASE_FUNCTIONS_BASE}/user-points`,
  mfaEmail: `${SUPABASE_FUNCTIONS_BASE}/mfa-email`,
  signCheckout: `${SUPABASE_FUNCTIONS_BASE}/sign-checkout`,
  checkoutResponse: `${SUPABASE_FUNCTIONS_BASE}/checkout-response`,
} as const;

// Max login attempts before temporary cooldown (enforced server-side by edge function)
export const SECURITY = {
  adminLoginMaxAttempts: 5,
  adminLoginCooldownMs: 60_000,
} as const;