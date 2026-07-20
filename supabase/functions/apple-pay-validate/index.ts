// apple-pay-validate — the Apple Pay merchant-validation handshake. Apple's JS
// calls onvalidatemerchant with a validationURL; the server must POST to that URL
// using the Apple Pay Merchant Identity certificate (mutual TLS) and return the
// merchant session to the browser.
//
// ⚠️ NOT YET FUNCTIONAL: needs the Apple Pay Merchant Identity certificate + the
// merchant id (from the Apple Developer account). Until then this endpoint exists
// and returns a pending result so the front-end flow is complete. See spec §9.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://cardtrain.com", "https://cardtrain.net",
  "https://www.cardtrain.com", "https://www.cardtrain.net",
  "http://localhost:5173", "http://localhost:3000",
];
const corsHeaders = (origin: string) => {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
  const { validationURL } = await req.json().catch(() => ({}));
  if (!validationURL) {
    return new Response(JSON.stringify({ error: "missing validationURL" }), {
      status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
  // Pending the Apple Pay Merchant Identity certificate.
  return new Response(
    JSON.stringify({ error: "Apple Pay is not yet available.", pending: true }),
    { status: 503, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
});
