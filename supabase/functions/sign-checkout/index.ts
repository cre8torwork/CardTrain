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
import { corsHeaders } from "../_shared/payments/cors.ts";
import { transactionTypeFor } from "../_shared/payments/order-kind.ts";
import { merchantForNetwork, type CardNetwork } from "../_shared/payments/merchants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// test: https://testsecureacceptance.cybersource.com/silent/pay
// live: https://secureacceptance.cybersource.com/silent/pay
const SA_ENDPOINT = Deno.env.get("CYBS_SA_ENDPOINT")!;

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
    const { orderId, network } = await req.json() as { orderId?: string; network?: CardNetwork };
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
      .select("id, user_id, kind, amount_minor, currency, status")
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

    // bill_to name + email are required by CyberSource. We pull them from the
    // authenticated user; ideally capture them at order creation instead.
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    const fullName = String(authUser?.user?.user_metadata?.full_name ?? "").trim();
    const [forename, ...rest] = fullName.split(/\s+/);
    const billTo = {
      forename: forename || "Card",
      surname: rest.join(" ") || "Holder",
      email: authUser?.user?.email ?? "",
    };

    // Visa/Mastercard and UnionPay are on DIFFERENT merchant accounts, each with
    // its own Secure Acceptance profile + keys. Pick the right one, or fail loudly
    // rather than sign a card against a merchant that cannot process it.
    let merchant;
    try {
      merchant = merchantForNetwork(network ?? "visa", Deno.env.toObject());
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 503,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const referenceNumber = newReferenceNumber();
    const fields = await buildSignedRequestFields(
      {
        accessKey: merchant.accessKey,
        profileId: merchant.profileId,
        transactionUuid: crypto.randomUUID(),
        signedDateTime: signedDateTimeNow(),
        locale: "en",
        transactionType: transactionTypeFor(order.kind),
        referenceNumber,
        amount: formatMinorUnits(order.amount_minor),
        currency: order.currency,
        paymentMethod: "card",
        billTo,
      },
      merchant.secretKey,
    );

    await supabase
      .from("orders")
      .update({
        status: "pending",
        reference_number: referenceNumber,
        // Record WHICH merchant took it — refunds and every follow-on must route
        // back through the same MID.
        mid: merchant.merchantId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    await supabase.from("payment_events").insert({
      order_id: order.id,
      type: "sign",
      amount_minor: order.amount_minor,
      actor: "system",
      detail: {
        reference_number: referenceNumber,
        transaction_type: fields.transaction_type,
        network: network ?? "visa",
        mid: merchant.merchantId,
      },
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
