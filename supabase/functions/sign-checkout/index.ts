// sign-checkout — server-side signing for CyberSource Secure Acceptance. Card data
// never touches this server under either integration:
//
//   Visa/Mastercard (…200) — Checkout API / Silent Order POST. The browser POSTs the
//     returned `fields` plus the card fields the customer typed straight to
//     CyberSource.
//   UnionPay (…204)        — Hosted Checkout. The browser POSTs only the signed
//     `fields`; CyberSource collects the card on its own page. GPAP requires this
//     merchant to use Hosted Checkout, which EBC records per transaction as the
//     "Client Application".
//
// `integration` in the response tells the browser which of the two it is holding,
// so the form knows whether to render card inputs at all.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSignedRequestFields } from "../_shared/payments/secure-acceptance.ts";
import { formatMinorUnits } from "../_shared/payments/money.ts";
import { corsHeaders } from "../_shared/payments/cors.ts";
import { transactionTypeFor } from "../_shared/payments/order-kind.ts";
import { merchantForNetwork, type CardNetwork } from "../_shared/payments/merchants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// CYBS_SA_ENDPOINT is the Checkout API (Silent Order POST) URL:
//   test: https://testsecureacceptance.cybersource.com/silent/pay
//   live: https://secureacceptance.cybersource.com/silent/pay
// It is no longer shared across merchants. CyberSource stamps the integration onto
// every transaction as the Business Center "Client Application", and GPAP requires
// UnionPay to read "Secure Acceptance Hosted Checkout" — handing both networks this
// one endpoint is exactly what made UnionPay read "Secure Acceptance SOP". Each
// merchant now carries its own endpoint (see merchants.ts).

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

/**
 * Reuse a shop order's delivery address as the billing address.
 *
 * Only shop_goods orders capture one (create-order stores it at
 * metadata.shipping); Buy Points orders have no address anywhere, which is why
 * the browser has to collect it for UnionPay. All three parts or none.
 */
function billingAddressFrom(
  metadata: unknown,
): { addressLine1?: string; city?: string; country?: string } {
  const s = (metadata as { shipping?: Record<string, string> } | null)?.shipping;
  if (!s) return {};
  const line1 = [s.flatFloor, s.building, s.address].map((p) => (p ?? "").trim())
    .filter(Boolean).join(", ");
  const city = (s.district ?? "").trim() || "Hong Kong";
  if (!line1) return {};
  return { addressLine1: line1.slice(0, 60), city: city.slice(0, 50), country: "HK" };
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
      .select("id, user_id, kind, amount_minor, currency, status, metadata")
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
      ...billingAddressFrom(order.metadata),
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
        // Only meaningful for Checkout API. Under Hosted Checkout CyberSource
        // collects the address on its own page, so nothing is declared unsigned.
        requireBillingAddress: merchant.integration === "checkout_api" &&
          (network ?? "visa") === "unionpay",
        integration: merchant.integration,
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
        // Recorded so a transaction can be traced back to the Client Application
        // EBC will show against it — the thing GPAP reviews.
        integration: merchant.integration,
      },
    });

    return new Response(
      JSON.stringify({
        endpoint: merchant.endpoint,
        integration: merchant.integration,
        fields,
      }),
      {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
