// oapm-refund — admin-gated, calls OAPM's Refund via JSAPIService.do. Mirrors
// payment-admin's admin check and money-code discipline: order state is only
// advanced on a confirmed processor result, never speculatively. Reuses the
// existing order-state.ts / refunds.ts state machine — OAPM has no
// authorize/capture split, so a paid OAPM order lands in the same 'paid' status
// the refund guard already accepts.
//
// ⚠️ PENDING LIVE VERIFICATION — including the Refund `service` value itself,
// which EFT's own docs disagree on (see _shared/payments/oapm-fields.ts,
// REFUND_SERVICE, and design spec §8 #3). Never called against
// oapm.eftpay.com.hk during development/tests. The APM ERS merchant portal stays
// available as a manual fallback (design spec §2, out of scope for this endpoint).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertCanApply } from "../_shared/payments/order-state.ts";
import { computeRefund } from "../_shared/payments/refunds.ts";
import { refundOutcomeFor } from "../_shared/payments/oapm-settle.ts";
import { signOapmFields } from "../_shared/payments/oapm-sign.ts";
import { REFUND_SERVICE, payTypeForWallet, type OapmWallet } from "../_shared/payments/oapm-fields.ts";
import { formatMinorUnits } from "../_shared/payments/money.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OAPM_USER_CONFIRM_KEY = Deno.env.get("OAPM_USER_CONFIRM_KEY")!;
const OAPM_SECRET = Deno.env.get("OAPM_SECRET")!;
const OAPM_BASE_URL = Deno.env.get("OAPM_BASE_URL")!;

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

function oapmTimeNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
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
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });

  try {
    const { orderId, amountMinor, adminId, reason } = (await req.json()) as {
      orderId?: string;
      amountMinor?: number;
      adminId?: string;
      reason?: string;
    };
    if (!orderId || !adminId) return json({ error: "missing orderId or adminId" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the admin (same pattern as payment-admin / admin-data).
    const { data: admin } = await supabase.from("admins").select("id").eq("id", adminId).maybeSingle();
    if (!admin) return json({ error: "unauthorized" }, 401);

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, status, gateway, amount_minor, refunded_minor, oapm_out_trade_no, oapm_eft_trade_no, oapm_wallet, oapm_pay_scene",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ error: "order not found" }, 404);
    if (order.gateway !== "oapm" || !order.oapm_out_trade_no || !order.oapm_eft_trade_no) {
      return json({ error: "order was not paid via OAPM" }, 400);
    }

    // Guard the transition before touching the processor.
    try {
      assertCanApply("refund", order.status);
    } catch (e) {
      return json({ error: (e as Error).message }, 409);
    }

    // Validate the amount against the paid total before calling the processor.
    let refundResult;
    try {
      refundResult = computeRefund(order.amount_minor, order.refunded_minor, Number(amountMinor));
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }

    const wallet = order.oapm_wallet as OapmWallet;
    const payType = payTypeForWallet(wallet);
    const outRefundNo = `RF${crypto.randomUUID().replace(/-/g, "").slice(0, 22).toUpperCase()}`;

    const fields: Record<string, string> = {
      service: REFUND_SERVICE,
      user_confirm_key: OAPM_USER_CONFIRM_KEY,
      out_trade_no: order.oapm_out_trade_no,
      eft_trade_no: order.oapm_eft_trade_no,
      out_refund_no: outRefundNo,
      return_amount: formatMinorUnits(Number(amountMinor)),
      total_fee: formatMinorUnits(order.amount_minor),
      wallet,
      payType,
      // buyerType is not persisted on the order (only recorded in the original
      // Sale's payment_events detail) — "others" is the documented default for a
      // back-office refund call the customer's device is not part of.
      buyerType: "others",
      pay_scene: order.oapm_pay_scene ?? "WEB",
      reason: reason || "requested by admin",
      time: oapmTimeNow(),
    };
    fields.sign = await signOapmFields(fields, OAPM_SECRET);

    // Real production HTTP call — never exercised during development/tests. Order
    // state is only advanced below once the processor confirms it.
    const endpoint = `${OAPM_BASE_URL.replace(/\/$/, "")}/JSAPIService.do`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const reply = await res.json();
    const tradeStatus = reply.trade_status ?? "";
    const refundOutcome = refundOutcomeFor(tradeStatus);

    if (refundOutcome === "fail" || refundOutcome === "processing") {
      await supabase.from("payment_events").insert({
        order_id: order.id,
        type: "error",
        amount_minor: Number(amountMinor),
        actor: adminId,
        detail: { gateway: "oapm", stage: "refund", out_refund_no: outRefundNo, reply },
      });
      return json(
        { error: `refund not confirmed (${tradeStatus || "no response"})`, pending: refundOutcome === "processing" },
        503,
      );
    }

    const newStatus = refundResult.status; // 'refunded' | 'partially_refunded' — our own accounting
    await supabase
      .from("orders")
      .update({
        status: newStatus,
        refunded_minor: refundResult.refundedMinor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    await supabase.from("payment_events").insert({
      order_id: order.id,
      type: "refund",
      amount_minor: Number(amountMinor),
      actor: adminId,
      detail: {
        gateway: "oapm",
        out_refund_no: outRefundNo,
        eft_trade_no: order.oapm_eft_trade_no,
        trade_status: tradeStatus,
      },
    });

    return json({ ok: true, status: newStatus, outRefundNo }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
