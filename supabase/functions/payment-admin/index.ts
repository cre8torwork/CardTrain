// payment-admin — human-gated back-office money operations: capture (on ship),
// void (pre-settlement), authorization reversal, and refund (partial or full).
//
// The state-machine guard (order-state.ts) and refund accounting (refunds.ts) are
// unit-tested. The actual CyberSource follow-on call is fenced behind
// processorFollowOn(): until it is implemented with real follow-on credentials it
// throws, so this endpoint can NEVER mutate order state without a confirmed
// processor result. Refunds route back through the MID that took the payment.
//
// ⚠️ Admin auth here matches the app's existing (weak) pattern — it trusts an
// `adminId` verified against the `admins` table (same as admin-data). Hardening
// admin auth is a separate, pre-existing concern.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assertCanApply,
  statusAfter,
  type BackOfficeAction,
} from "../_shared/payments/order-state.ts";
import { computeRefund } from "../_shared/payments/refunds.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

interface OrderRow {
  id: string;
  status: string;
  mid: string;
  amount_minor: number;
  refunded_minor: number;
  cybersource_request_id: string | null;
}

/**
 * Submit the follow-on to CyberSource against the order's own MID.
 * PENDING CREDENTIALS: both REST and Simple Order carry these (GPAP-confirmed);
 * the concrete call is wired once the follow-on credentials / P12 are provided.
 * Returns the processor's follow-on request id on success.
 */
// deno-lint-ignore no-unused-vars
async function processorFollowOn(
  action: BackOfficeAction,
  order: OrderRow,
  amountMinor: number,
): Promise<string> {
  throw new Error("processor follow-on not configured (pending follow-on credentials)");
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  try {
    const { action, orderId, amountMinor, adminId } = await req.json() as {
      action: BackOfficeAction; orderId: string; amountMinor?: number; adminId: string;
    };
    if (!["capture", "void", "reversal", "refund"].includes(action)) return json({ error: "invalid action" }, 400);
    if (!orderId || !adminId) return json({ error: "missing orderId or adminId" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the admin (same pattern as admin-data).
    const { data: admin } = await supabase.from("admins").select("id").eq("id", adminId).maybeSingle();
    if (!admin) return json({ error: "unauthorized" }, 401);

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, mid, amount_minor, refunded_minor, cybersource_request_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ error: "order not found" }, 404);

    // Guard the transition before touching the processor.
    try {
      assertCanApply(action, order.status);
    } catch (e) {
      return json({ error: (e as Error).message }, 409);
    }

    // For a refund, validate the amount against the captured total first.
    let refundResult: { refundedMinor: number; status: string } | null = null;
    const opAmount = action === "refund" ? Number(amountMinor) : order.amount_minor;
    if (action === "refund") {
      try {
        refundResult = computeRefund(order.amount_minor, order.refunded_minor, opAmount);
      } catch (e) {
        return json({ error: (e as Error).message }, 400);
      }
    }

    // Submit to the processor. Order state is only advanced on success.
    let processorRef: string;
    try {
      processorRef = await processorFollowOn(action, order as OrderRow, opAmount);
    } catch (e) {
      return json({ error: (e as Error).message, pending: true }, 503);
    }

    const newStatus = action === "refund" ? refundResult!.status : statusAfter(action);
    const patch: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (action === "refund") patch.refunded_minor = refundResult!.refundedMinor;

    await supabase.from("orders").update(patch).eq("id", order.id);
    await supabase.from("payment_events").insert({
      order_id: order.id,
      type: action,
      amount_minor: opAmount,
      actor: adminId,
      detail: { processor_ref: processorRef, mid: order.mid },
    });

    return json({ ok: true, status: newStatus, processorRef }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
