// apple-pay — receives the Apple Pay payment token and submits it to CyberSource
// via the Simple Order API (paymentSolution 001, MID gphk088034609202).
//
// ⚠️ NOT YET FUNCTIONAL: needs the Apple Pay merchant setup (Developer account,
// merchant id, Payment Processing Certificate whose CSR CyberSource generates),
// the /.well-known/apple-developer-merchantid-domain-association file on the live
// host, and the wallet backend (PHP/Java/.NET) + P12. Until then this endpoint
// exists and returns a pending result. See the design spec §9.

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
  const { orderId, token } = await req.json().catch(() => ({}));
  if (!orderId || !token) {
    return new Response(JSON.stringify({ error: "missing orderId or token" }), {
      status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
  // Pending the Apple Pay merchant setup + wallet backend + P12 certs.
  return new Response(
    JSON.stringify({ ok: false, pending: true, message: "Apple Pay is not yet available." }),
    { status: 503, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
});
