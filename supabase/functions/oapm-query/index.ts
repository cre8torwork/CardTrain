// oapm-query — Query fallback for reconciliation (QRcodeTradeQuery.do). Used two
// ways:
//   1. An authenticated customer polling their own order after being redirected
//      back from the wallet app. return_url carries no state (design spec §4) —
//      this is how the "customer closed the browser mid-payment, must still
//      reconcile via history" test case gets resolved without waiting on notify.
//   2. Admin/cron reconciliation (adminId, same check as payment-admin) for orders
//      stuck `pending` past active_time.
// Never trusts a browser-supplied outcome — always re-derives status from EFT's
// own response, same discipline as oapm-notify.
//
// ⚠️ PENDING LIVE VERIFICATION — see _shared/payments/oapm-sign.ts. Never called
// against oapm.eftpay.com.hk during development/tests.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signOapmFields, verifyOapmSignature } from "../_shared/payments/oapm-sign.ts";
import { paymentOutcomeFor, applyOapmPaymentOutcome } from "../_shared/payments/oapm-settle.ts";
import { oapmTimeNow } from "../_shared/payments/oapm-fields.ts";
import { corsHeaders } from "../_shared/payments/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OAPM_USER_CONFIRM_KEY = Deno.env.get("OAPM_USER_CONFIRM_KEY")!;
const OAPM_SECRET = Deno.env.get("OAPM_SECRET")!;
const OAPM_BASE_URL = Deno.env.get("OAPM_BASE_URL")!;

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
    const { orderId, adminId } = (await req.json()) as { orderId?: string; adminId?: string };
    if (!orderId) return json({ error: "missing orderId" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Two callers: an authenticated end user checking their own order, or an
    // admin/cron job reconciling any order (same admin check as payment-admin).
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    let authorizedUserId: string | null = null;
    if (jwt) {
      const {
        data: { user },
      } = await supabase.auth.getUser(jwt);
      authorizedUserId = user?.id ?? null;
    }
    if (!authorizedUserId) {
      if (!adminId) return json({ error: "unauthorized" }, 401);
      const { data: admin } = await supabase.from("admins").select("id").eq("id", adminId).maybeSingle();
      if (!admin) return json({ error: "unauthorized" }, 401);
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, kind, amount_minor, ctp_amount, status, oapm_out_trade_no, oapm_eft_trade_no")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ error: "order not found" }, 404);
    if (authorizedUserId && order.user_id !== authorizedUserId) {
      return json({ error: "unauthorized" }, 401);
    }

    // Already resolved — return the cached status, no need to call EFT again.
    if (order.status !== "created" && order.status !== "pending") {
      return json({ status: order.status }, 200);
    }
    if (!order.oapm_out_trade_no) {
      // The OAPM Sale request was never sent for this order yet.
      return json({ status: order.status }, 200);
    }

    const fields: Record<string, string> = {
      querytype: "OUT_TRADE",
      user_confirm_key: OAPM_USER_CONFIRM_KEY,
      out_trade_no: order.oapm_out_trade_no,
      time: oapmTimeNow(),
    };
    fields.sign = await signOapmFields(fields, OAPM_SECRET);

    // Real production HTTP call — never exercised during development/tests.
    const endpoint = `${OAPM_BASE_URL.replace(/\/$/, "")}/QRcodeTradeQuery.do`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const reply = await res.json();

    // The design spec documents signature verification for notify payloads
    // explicitly; whether every Query response also carries a `sign` field is
    // unconfirmed. Verify it when present, and never trust an unverifiable one.
    if (reply.sign && !(await verifyOapmSignature(reply, OAPM_SECRET))) {
      return json({ error: "could not verify query response" }, 502);
    }

    const tradeStatus = reply.trade_status ?? "";
    const outcome = paymentOutcomeFor(tradeStatus);
    if (outcome === "pending") {
      return json({ status: order.status }, 200);
    }

    const eftTradeNo = reply.eft_trade_no ?? order.oapm_eft_trade_no ?? "";
    const result = await applyOapmPaymentOutcome(supabase, order, outcome, eftTradeNo, {
      source: "query",
      trade_status: tradeStatus,
    });
    return json({ status: result.status }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
