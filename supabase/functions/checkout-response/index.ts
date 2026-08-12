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
import { isPointsPurchase, paidStatusFor } from "../_shared/payments/order-kind.ts";
import { merchantForProfileId, configuredMerchants } from "../_shared/payments/merchants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://cardtrain.com";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// The confirmation page GPAP screenshots: status + the exact message + the
// reference number. No sensitive wording ever (guaranteed by confirmationFor).
function confirmationPage(category: string, message: string, referenceNumber = ""): string {
  const ok = category === "success";
  // When loaded inside the site's payment iframe, hand the verified outcome up to
  // the app so it can render its own confirmation — the customer never leaves the
  // site. The visible markup below is the fallback when opened at top level.
  const bridge = `<script>
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(JSON.stringify({
          source: "cardtrain-payment",
          category: ${JSON.stringify(category)},
          message: ${JSON.stringify(message)},
          referenceNumber: ${JSON.stringify(referenceNumber)}
        }), ${JSON.stringify(SITE_URL)});
      }
    } catch (e) {}
  </script>`;
  const accent = ok ? "#059669" : "#dc2626";
  const icon = ok ? "&#10003;" : "&#33;";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Payment ${ok ? "Successful" : "Result"} — Card Train</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:#f8fafc;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{background:#fff;max-width:440px;width:calc(100% - 32px);border-radius:20px;
    box-shadow:0 10px 40px rgba(0,0,0,.08);padding:40px 32px;text-align:center}
  .badge{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    margin:0 auto 20px;font-size:36px;color:#fff;background:${accent}}
  h1{font-size:20px;margin:0 0 12px}
  p{color:#475569;line-height:1.6;margin:0 0 24px}
  a{display:inline-block;padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#f43f5e,#ec4899);
    color:#fff;text-decoration:none;font-weight:700}
</style></head><body>
<div class="card">
  <div class="badge">${icon}</div>
  <h1>${ok ? "Payment Successful" : "Payment Not Completed"}</h1>
  <p>${escapeHtml(message)}</p>
  <a href="${escapeHtml(SITE_URL)}">Return to Card Train</a>
</div>${bridge}</body></html>`;
}


/**
 * CyberSource names the offending fields in the response as missingField_0..N
 * (reason 101) and invalidField_0..N (reason 102). Without these, a 101/102 is
 * untraceable — you know something is wrong but not what. Capture them.
 */
function fieldProblems(fields: Record<string, string>): { missing: string[]; invalid: string[] } {
  const pick = (prefix: string) =>
    Object.keys(fields)
      .filter((k) => k.startsWith(prefix))
      .sort()
      .map((k) => fields[k])
      .filter(Boolean);
  return { missing: pick("missingField_"), invalid: pick("invalidField_") };
}

const htmlResponse = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

/**
 * Credit CTP exactly once for a paid order.
 *
 * Returns the insert error instead of swallowing it. This matters: the money has
 * ALREADY been taken by the time we get here, so a silent failure means a paid
 * order with zero points and no trace — the worst possible outcome. Observed for
 * real: `points.user_id` has a FK to public.users(id), so an auth user without a
 * matching public.users row fails with 23503 and the customer gets nothing.
 */
async function creditPointsOnce(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ctp: number,
  idempotencyKey: string,
): Promise<{ error: unknown | null }> {
  // Same idempotency idiom as user-points: dedupe on `description`.
  const { data: existing } = await supabase
    .from("points")
    .select("id")
    .eq("description", idempotencyKey)
    .maybeSingle();
  if (existing) return { error: null };
  const { error } = await supabase.from("points").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    amount: ctp,
    type: "purchase",
    description: idempotencyKey,
    created_at: new Date().toISOString(),
  });
  return { error: error ?? null };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const raw = await req.text();
    const fields: Record<string, string> = {};
    new URLSearchParams(raw).forEach((v, k) => (fields[k] = v));

    // Verify with the key that SIGNED this response. Visa/Mastercard (…200) and
    // UnionPay (…204) are separate merchants with separate secrets — verifying a
    // UnionPay response against the …200 secret fails, and the customer is told
    // the transaction could not be verified AFTER their card was charged.
    const env = Deno.env.toObject();
    const byProfile = merchantForProfileId(fields.req_profile_id ?? "", env);
    // Prefer the profile named in the response; fall back to trying each
    // configured merchant so a missing/renamed profile id still verifies.
    const candidates = byProfile ? [byProfile] : configuredMerchants(env);

    let verifiedWith: string | null = null;
    for (const m of candidates) {
      if (await verifyResponseSignature(fields, m.secretKey)) {
        verifiedWith = m.merchantId;
        break;
      }
    }
    if (!verifiedWith) {
      console.error(
        "[checkout-response] signature verification FAILED",
        { req_profile_id: fields.req_profile_id, tried: candidates.map((m) => m.merchantId) },
      );
      return htmlResponse(
        confirmationPage("retry", "We could not verify this transaction. Please try again."),
        400,
      );
    }

    const referenceNumber = fields.req_reference_number ?? "";
    const reasonCode = Number(fields.reason_code);
    const transactionId = fields.transaction_id ?? "";
    const confirmation = confirmationFor(reasonCode, referenceNumber);
    const problems = fieldProblems(fields);
    if (reasonCode !== 100) {
      console.error("[checkout-response] declined", {
        reasonCode,
        referenceNumber,
        message: fields.message,
        missing: problems.missing,
        invalid: problems.invalid,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, kind, ctp_amount, amount_minor, cybersource_request_id")
      .eq("reference_number", referenceNumber)
      .maybeSingle();

    if (order) {
      await supabase.from("payment_events").insert({
        order_id: order.id,
        type: reasonCode === 100 ? (isPointsPurchase(order.kind) ? "sale" : "auth") : "decline",
        amount_minor: order.amount_minor,
        reason_code: reasonCode,
        actor: "system",
        detail: {
          decision: fields.decision,
          transaction_id: transactionId,
          message: fields.message ?? "",
          // reason 101 -> missing, 102 -> invalid. Recording these is the
          // difference between a diagnosable failure and a guessing game.
          ...(problems.missing.length ? { missing_fields: problems.missing } : {}),
          ...(problems.invalid.length ? { invalid_fields: problems.invalid } : {}),
        },
      });

      if (reasonCode === 100) {
        // Claim the order for this transaction id (one success per order).
        const { data: claimed } = await supabase
          .from("orders")
          .update({
            status: paidStatusFor(order.kind),
            cybersource_request_id: transactionId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .is("cybersource_request_id", null)
          .select("id");

        // Credit points only if we actually claimed it now, and only for Buy Points.
        if (claimed && claimed.length > 0 && isPointsPurchase(order.kind) && order.ctp_amount) {
          const { error: creditError } = await creditPointsOnce(
            supabase, order.user_id, order.ctp_amount, `cybs:${transactionId}`,
          );
          if (creditError) {
            // Money is already taken. Never fail silently — record it so the order
            // can be found and the points granted manually.
            console.error("[checkout-response] POINTS CREDIT FAILED", order.id, creditError);
            await supabase.from("payment_events").insert({
              order_id: order.id,
              type: "credit_failed",
              amount_minor: order.amount_minor,
              reason_code: reasonCode,
              actor: "system",
              detail: {
                ctp_amount: order.ctp_amount,
                transaction_id: transactionId,
                error: String((creditError as { message?: string })?.message ?? creditError),
              },
            });
          }
        }
      } else {
        await supabase
          .from("orders")
          .update({ status: confirmation.category === "retry" ? "error" : "declined", updated_at: new Date().toISOString() })
          .eq("id", order.id);
      }
    }

    return htmlResponse(
      confirmationPage(confirmation.category, confirmation.message, referenceNumber),
      200,
    );
  } catch (_e) {
    return htmlResponse(
      confirmationPage("retry", "Transaction unsuccessful, please try again..."),
      500,
    );
  }
});
