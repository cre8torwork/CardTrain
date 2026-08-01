// CORS origin handling shared by every payment edge function.
//
// ⚠️ The bug this replaces: each function had its own copy of
//     const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
// so ANY origin not in the hard-coded list got back
// "Access-Control-Allow-Origin: https://cardtrain.com". That never matches the
// caller, so the browser blocks the response and supabase-js surfaces the opaque
// "Failed to send a request to the Edge Function" — which looks like the function
// is down when it is actually healthy. It bit us on `vite preview` (:4173) and
// would bite on any Readdy preview URL or non-standard dev port.
//
// Now: an allowed origin is echoed back exactly; a disallowed one gets NO
// allow-origin header (an honest CORS rejection instead of a misleading one).
// Add origins at deploy time via EXTRA_ALLOWED_ORIGINS (comma-separated).

const STATIC_ORIGINS = [
  "https://cardtrain.com",
  "https://cardtrain.net",
  "https://www.cardtrain.com",
  "https://www.cardtrain.net",
];

// Dev servers move ports (vite dev 3000/5173, vite preview 4173) and Readdy
// serves builder/preview subdomains. Anchored so look-alikes never match.
const ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/([a-z0-9-]+\.)*readdy\.ai$/,
];

function extraOrigins(): string[] {
  const env = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env;
  return (env?.get("EXTRA_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (STATIC_ORIGINS.includes(origin)) return true;
  if (extraOrigins().includes(origin)) return true;
  return ORIGIN_PATTERNS.some((re) => re.test(origin));
}

/** CORS headers for a request. Allowed origins are echoed; others get none. */
export function corsHeaders(origin: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin", // responses differ per origin — don't let caches cross them
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin as string;
  return headers;
}
