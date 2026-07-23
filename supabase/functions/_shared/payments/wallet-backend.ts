// Shared Deno-side flow for a wallet payment: authorize via the PHP wallet gateway
// (Simple Order API), then advance the order and credit points exactly as the card
// flow does. google-pay and apple-pay are thin wrappers over this.
//
// ⚠️ PENDING: needs the deployed wallet gateway (WALLET_GATEWAY_URL) + its shared
// key (WALLET_SERVICE_KEY) + the P12s. Until WALLET_GATEWAY_URL is set, returns a
// clear "not yet available" instead of erroring.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatMinorUnits } from "./money.ts";
import { confirmationFor } from "./reason-codes.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GATEWAY_URL = Deno.env.get("WALLET_GATEWAY_URL") ?? "";
const SERVICE_KEY = Deno.env.get("WALLET_SERVICE_KEY") ?? "";

function newReferenceNumber(): string {
  return `CT${Date.now().toString(36)}${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
}

async function creditPointsOnce(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ctp: number,
  idempotencyKey: string,
): Promise<void> {
  const { data: existing } = await supabase.from("points").select("id").eq("description", idempotencyKey).maybeSingle();
  if (existing) return;
  await supabase.from("points").insert({
    id: crypto.randomUUID(), user_id: userId, amount: ctp, type: "purchase",
    description: idempotencyKey, created_at: new Date().toISOString(),
  });
}

export interface WalletResult {
  ok: boolean;
  message: string;
}

/** Authorize a wallet payment for an existing order and settle it (points / status). */
export async function submitWalletPayment(
  wallet: "apple" | "google",
  jwt: string,
  orderId: string,
  token: string,
  cardType: string | null,
): Promise<{ status: number; body: WalletResult | { error: string } }> {
  if (!GATEWAY_URL || !SERVICE_KEY) {
    return { status: 503, body: { error: `${wallet} pay is not yet available` } };
  }
  if (!orderId || !token) return { status: 400, body: { error: "missing orderId or token" } };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user } } = await supabase.auth.getUser(jwt);
  if (!user) return { status: 401, body: { error: "unauthorized" } };

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, kind, amount_minor, currency, status, ctp_amount, cybersource_request_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== user.id) return { status: 404, body: { error: "order not found" } };
  if (!["created", "pending", "declined", "error"].includes(order.status)) {
    return { status: 409, body: { error: `order not payable (${order.status})` } };
  }

  const isSale = order.kind !== "shop_goods"; // points = Sale; shop goods = auth, capture on ship
  const referenceNumber = newReferenceNumber();
  const fullName = String(user.user_metadata?.full_name ?? "").trim();
  const [firstName, ...rest] = fullName.split(/\s+/);

  const res = await fetch(`${GATEWAY_URL}/wallet/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Service-Key": SERVICE_KEY },
    body: JSON.stringify({
      wallet,
      referenceCode: referenceNumber,
      amount: formatMinorUnits(order.amount_minor),
      currency: order.currency,
      token,
      capture: isSale,
      cardType,
      billTo: {
        firstName: firstName || "Card",
        lastName: rest.join(" ") || "Holder",
        email: user.email ?? "",
      },
    }),
  });
  const reply = await res.json().catch(() => ({}));
  const reasonCode = Number(reply.reasonCode);
  const confirmation = confirmationFor(reasonCode, referenceNumber);

  await supabase.from("orders").update({ reference_number: referenceNumber, status: "pending", updated_at: new Date().toISOString() }).eq("id", order.id);
  await supabase.from("payment_events").insert({
    order_id: order.id,
    type: reasonCode === 100 ? (isSale ? "sale" : "auth") : "decline",
    amount_minor: order.amount_minor,
    reason_code: Number.isFinite(reasonCode) ? reasonCode : null,
    actor: "system",
    detail: { wallet, decision: reply.decision, request_id: reply.requestId },
  });

  if (reasonCode === 100) {
    const { data: claimed } = await supabase
      .from("orders")
      .update({ status: isSale ? "paid" : "authorized", cybersource_request_id: reply.requestId, updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .is("cybersource_request_id", null)
      .select("id");
    if (claimed?.length && isSale && order.ctp_amount) {
      await creditPointsOnce(supabase, order.user_id, order.ctp_amount, `cybs:${reply.requestId}`);
    }
    return { status: 200, body: { ok: true, message: confirmation.message } };
  }

  await supabase.from("orders").update({ status: confirmation.category === "retry" ? "error" : "declined", updated_at: new Date().toISOString() }).eq("id", order.id);
  return { status: 200, body: { ok: false, message: confirmation.message } };
}
