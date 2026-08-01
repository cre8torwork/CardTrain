// apple-pay — receives the Apple Pay token and authorizes it via the PHP wallet
// gateway (CyberSource Simple Order API, paymentSolution 001, MID …202). The
// browser sends the base64 of token.paymentData plus the card network. Order
// state + points crediting live in submitWalletPayment (shared with google-pay).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { submitWalletPayment } from "../_shared/payments/wallet-backend.ts";
import { corsHeaders } from "../_shared/payments/cors.ts";

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
  const { orderId, token, cardType } = await req.json().catch(() => ({}));
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { status, body } = await submitWalletPayment("apple", jwt, orderId, token, cardType ?? null);
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
});
