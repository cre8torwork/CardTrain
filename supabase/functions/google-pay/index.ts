// google-pay — receives the Google Pay token and submits it to CyberSource via
// the Simple Order API (paymentSolution 012, MID gphk088034609201).
//
// ⚠️ NOT YET FUNCTIONAL: Simple Order API has no Deno/Node SDK, and this rail
// needs the P12 certificate. Until the wallet backend (PHP/Java/.NET) + certs are
// provided, this endpoint validates the request and returns a pending result so
// the front-end button flow exists end to end. See the design spec §9.

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
  // Pending the wallet backend + P12 certs.
  return new Response(
    JSON.stringify({ ok: false, pending: true, message: "Google Pay is not yet available." }),
    { status: 503, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
});
