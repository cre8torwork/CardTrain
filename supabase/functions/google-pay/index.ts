// google-pay — receives the Google Pay token and authorizes it via the PHP wallet
// gateway (CyberSource Simple Order API, paymentSolution 012, MID …201). All order
// state + points crediting live in submitWalletPayment (shared with apple-pay).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { submitWalletPayment } from "../_shared/payments/wallet-backend.ts";

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
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { status, body } = await submitWalletPayment("google", jwt, orderId, token, null);
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
});
