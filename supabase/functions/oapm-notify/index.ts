// oapm-notify — public webhook for OAPM's notify_url. Verifies the signature,
// then idempotently updates the order and (for buy_points orders) credits CTP
// exactly once. This is the PRIMARY source of order state for the OAPM rail — the
// browser's return_url carries no parameters and must NEVER be treated as a state
// source (design spec §4, §6).
//
// Must respond with the literal string "success" (case-insensitive, unsigned) to
// stop EFT's retries — anything else and EFT keeps retrying the same notify.
//
// ⚠️ PENDING LIVE VERIFICATION: no sandbox exists; this has never received a real
// EFT notify. Signature verification is unit-tested
// (_shared/payments/oapm-sign.test.ts); the trade_status classification is
// unit-tested (_shared/payments/oapm-settle.test.ts). The end-to-end DB flow is
// not — see _shared/payments/oapm-settle.ts.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyOapmSignature } from "../_shared/payments/oapm-sign.ts";
import { paymentOutcomeFor, applyOapmPaymentOutcome } from "../_shared/payments/oapm-settle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OAPM_SECRET = Deno.env.get("OAPM_SECRET")!;

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

serve(async (req: Request) => {
  if (req.method !== "POST") return text("method not allowed", 405);

  try {
    const fields = (await req.json()) as Record<string, string>;

    if (!(await verifyOapmSignature(fields, OAPM_SECRET))) {
      // Do not trust an unverifiable payload, and do not respond "success" — a
      // genuinely (correctly signed) EFT retry can still land and succeed later.
      return text("invalid signature", 400);
    }

    const outTradeNo = fields.out_trade_no ?? "";
    const eftTradeNo = fields.eft_trade_no ?? fields.eftpay_trade_no ?? "";
    const tradeStatus = fields.trade_status ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, kind, amount_minor, ctp_amount, oapm_eft_trade_no")
      .eq("oapm_out_trade_no", outTradeNo)
      .maybeSingle();

    if (!order) {
      // Nothing to reconcile against; still stop the retry loop — retrying will
      // not manufacture an order that doesn't exist.
      return text("success", 200);
    }

    const outcome = paymentOutcomeFor(tradeStatus);
    if (outcome !== "pending") {
      await applyOapmPaymentOutcome(supabase, order, outcome, eftTradeNo, {
        source: "notify",
        trade_status: tradeStatus,
        wallet: fields.wallet,
        total_fee: fields.total_fee,
      });
    }

    return text("success", 200);
  } catch (_e) {
    return text("error", 500);
  }
});
