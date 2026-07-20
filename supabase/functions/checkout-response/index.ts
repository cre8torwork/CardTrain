// checkout-response — receives CyberSource Secure Acceptance's signed POST-back,
// verifies the signature, maps the reason code to the GPAP confirmation message,
// advances the order, and (for a successful Buy Points sale) credits CTP points
// exactly once.
//
// ⚠️ PENDING SANDBOX VERIFICATION: signature verification and reason-code mapping
// are unit-tested (_shared/payments/*.test.ts); the end-to-end flow needs real
// Secure Acceptance credentials + a running DB. The order is correlated to the
// response via req_reference_number (the unique per-attempt ref we stored).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyResponseSignature } from "../_shared/payments/secure-acceptance.ts";
import { confirmationFor } from "../_shared/payments/reason-codes.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SA_SECRET_KEY = Deno.env.get("CYBS_SA_SECRET_KEY")!;

async function creditPointsOnce(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ctp: number,
  idempotencyKey: string,
): Promise<void> {
  // Same idempotency idiom as user-points: dedupe on `description`.
  const { data: existing } = await supabase
    .from("points")
    .select("id")
    .eq("description", idempotencyKey)
    .maybeSingle();
  if (existing) return;
  await supabase.from("points").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    amount: ctp,
    type: "purchase",
    description: idempotencyKey,
    created_at: new Date().toISOString(),
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const raw = await req.text();
    const fields: Record<string, string> = {};
    new URLSearchParams(raw).forEach((v, k) => (fields[k] = v));

    if (!(await verifyResponseSignature(fields, SA_SECRET_KEY))) {
      return new Response(JSON.stringify({ error: "signature verification failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const referenceNumber = fields.req_reference_number ?? "";
    const reasonCode = Number(fields.reason_code);
    const transactionId = fields.transaction_id ?? "";
    const confirmation = confirmationFor(reasonCode, referenceNumber);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, kind, ctp_amount, amount_minor, cybersource_request_id")
      .eq("reference_number", referenceNumber)
      .maybeSingle();

    if (order) {
      await supabase.from("payment_events").insert({
        order_id: order.id,
        type: reasonCode === 100 ? (order.kind === "buy_points" ? "sale" : "auth") : "decline",
        amount_minor: order.amount_minor,
        reason_code: reasonCode,
        actor: "system",
        detail: { decision: fields.decision, transaction_id: transactionId },
      });

      if (reasonCode === 100) {
        // Claim the order for this transaction id (one success per order).
        const { data: claimed } = await supabase
          .from("orders")
          .update({
            status: order.kind === "buy_points" ? "paid" : "authorized",
            cybersource_request_id: transactionId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .is("cybersource_request_id", null)
          .select("id");

        // Credit points only if we actually claimed it now, and only for Buy Points.
        if (claimed && claimed.length > 0 && order.kind === "buy_points" && order.ctp_amount) {
          await creditPointsOnce(supabase, order.user_id, order.ctp_amount, `cybs:${transactionId}`);
        }
      } else {
        await supabase
          .from("orders")
          .update({ status: confirmation.category === "retry" ? "error" : "declined", updated_at: new Date().toISOString() })
          .eq("id", order.id);
      }
    }

    return new Response(
      JSON.stringify({ category: confirmation.category, message: confirmation.message, referenceNumber }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
