// sign-checkout — server-side signing for CyberSource Secure Acceptance
// (Checkout API / Silent Order POST). The browser POSTs the returned `fields`
// (plus the card fields the customer types) directly to CyberSource; card data
// never touches this server.
//
// ⚠️ PENDING SANDBOX VERIFICATION: the signing logic is unit-tested
// (_shared/payments/secure-acceptance.test.ts), but an end-to-end run needs the
// real Secure Acceptance credentials (Profile ID / Access Key / Secret Key) from
// EBC2 — not yet in hand. Do not treat a green deploy as a passed transaction.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSignedRequestFields } from "../_shared/payments/secure-acceptance.ts";
import { formatMinorUnits } from "../_shared/payments/money.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SA_PROFILE_ID = Deno.env.get("CYBS_SA_PROFILE_ID")!;
const SA_ACCESS_KEY = Deno.env.get("CYBS_SA_ACCESS_KEY")!;
const SA_SECRET_KEY = Deno.env.get("CYBS_SA_SECRET_KEY")!;
// test: https://testsecureacceptance.cybersource.com/silent/pay
// live: https://secureacceptance.cybersource.com/silent/pay
const SA_ENDPOINT = Deno.env.get("CYBS_SA_ENDPOINT")!;

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

// A new, unique reference_number on EVERY request — including retries of the same
// order (GPAP requirement). Double-charge protection lives in the order state
// machine, not here.
function newReferenceNumber(): string {
  return `CT${Date.now().toString(36)}${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
}

// CyberSource wants yyyy-MM-dd'T'HH:mm:ss'Z' (no milliseconds).
function signedDateTimeNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
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

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Re-derive the amount from our own order — never sign an amount the browser sent.
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, kind, amount_minor, currency, status")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      return new Response(JSON.stringify({ error: "order not found" }), {
        status: 404,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }
    // Only orders that have not already succeeded may start a new attempt.
    if (!["created", "pending", "declined", "error"].includes(order.status)) {
      return new Response(JSON.stringify({ error: `order not payable (${order.status})` }), {
        status: 409,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const referenceNumber = newReferenceNumber();
    const fields = await buildSignedRequestFields(
      {
        accessKey: SA_ACCESS_KEY,
        profileId: SA_PROFILE_ID,
        transactionUuid: crypto.randomUUID(),
        signedDateTime: signedDateTimeNow(),
        locale: "en",
        transactionType: order.kind === "buy_points" ? "sale" : "authorization",
        referenceNumber,
        amount: formatMinorUnits(order.amount_minor),
        currency: order.currency,
      },
      SA_SECRET_KEY,
    );

    await supabase
      .from("orders")
      .update({ status: "pending", reference_number: referenceNumber, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    await supabase.from("payment_events").insert({
      order_id: order.id,
      type: "sign",
      amount_minor: order.amount_minor,
      actor: "system",
      detail: { reference_number: referenceNumber, transaction_type: fields.transaction_type },
    });

    return new Response(JSON.stringify({ endpoint: SA_ENDPOINT, fields }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
