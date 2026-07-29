// Classifies OAPM trade_status values into our order state machine, and applies a
// verified outcome to an order exactly once. Shared by oapm-notify (primary) and
// oapm-query (fallback/reconciliation) so the idempotent-claim + CTP-credit logic
// exists in ONE place — the same reason wallet-backend.ts factors the CyberSource
// wallet flow out of apple-pay/google-pay.
//
// Two different trade_status vocabularies exist (design spec §4):
//   Sale/Query: TRADE_SUCCESS is the ONLY value that means paid.
//   Refund:     TRADE_PROCESSING -> APPLY_SUCCESS -> TRADE_REFUND (partial) /
//               TRADE_CLOSED (full) / TRADE_FAIL.

export type PaymentOutcome = 'paid' | 'declined' | 'pending';

/** Sale/Query trade_status -> order outcome. Only TRADE_SUCCESS is a paid claim. */
export function paymentOutcomeFor(tradeStatus: string): PaymentOutcome {
  if (tradeStatus === 'TRADE_SUCCESS') return 'paid';
  if (tradeStatus === 'TRADE_FAIL' || tradeStatus === 'TRADE_CLOSED') return 'declined';
  return 'pending'; // TRADE_PROCESSING / unknown / empty — no terminal claim yet
}

export type RefundOutcome = 'processing' | 'partial' | 'full' | 'fail';

/** Refund trade_status -> refund outcome. */
export function refundOutcomeFor(tradeStatus: string): RefundOutcome {
  if (tradeStatus === 'TRADE_REFUND') return 'partial';
  if (tradeStatus === 'TRADE_CLOSED') return 'full';
  if (tradeStatus === 'TRADE_FAIL') return 'fail';
  return 'processing'; // TRADE_PROCESSING / APPLY_SUCCESS / unknown
}

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = any;

export interface OapmOrderRow {
  id: string;
  user_id: string;
  kind: string;
  amount_minor: number;
  ctp_amount: number | null;
  oapm_eft_trade_no: string | null;
}

// ⚠️ DB-touching — not unit-tested (needs a running Supabase project); the pure
// classification functions above are. Needs a real EFT notify/query response to
// exercise end to end (no sandbox — see design spec §7, §10).

async function creditCtpOnce(
  supabase: AnySupabaseClient,
  userId: string,
  ctp: number,
  idempotencyKey: string,
): Promise<void> {
  // Same idempotency idiom as checkout-response.ts: dedupe on `description`.
  const { data: existing } = await supabase
    .from('points')
    .select('id')
    .eq('description', idempotencyKey)
    .maybeSingle();
  if (existing) return;
  await supabase.from('points').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    amount: ctp,
    type: 'purchase',
    description: idempotencyKey,
    created_at: new Date().toISOString(),
  });
}

/**
 * Apply a verified Sale/Query outcome to an order: idempotent claim on
 * oapm_eft_trade_no (mirrors cybersource_request_id), credit CTP exactly once for
 * buy_points* orders. OAPM has no authorize/capture split (unlike the card rail,
 * which distinguishes 'authorized' from 'captured') — a successful wallet payment
 * goes straight to 'paid', a status the existing refund guard (order-state.ts)
 * already accepts.
 */
export async function applyOapmPaymentOutcome(
  supabase: AnySupabaseClient,
  order: OapmOrderRow,
  outcome: 'paid' | 'declined',
  eftTradeNo: string,
  detail: Record<string, unknown>,
): Promise<{ status: string; credited: boolean }> {
  await supabase.from('payment_events').insert({
    order_id: order.id,
    type: outcome === 'paid' ? 'sale' : 'decline',
    amount_minor: order.amount_minor,
    actor: 'system',
    detail: { gateway: 'oapm', eft_trade_no: eftTradeNo, ...detail },
  });

  if (outcome !== 'paid') {
    await supabase
      .from('orders')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', order.id);
    return { status: 'declined', credited: false };
  }

  // Claim the order for this trade id (one success per order) — never claim twice.
  const { data: claimed } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      oapm_eft_trade_no: eftTradeNo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .is('oapm_eft_trade_no', null)
    .select('id');

  const credited = Boolean(claimed?.length);
  if (credited && (order.kind === 'buy_points' || order.kind === 'buy_points_custom') && order.ctp_amount) {
    await creditCtpOnce(supabase, order.user_id, order.ctp_amount, `oapm:${eftTradeNo}`);
  }
  return { status: 'paid', credited };
}
