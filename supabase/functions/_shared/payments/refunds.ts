// Refund accounting. Partial refunds accumulate against the captured amount and
// may never exceed it. Amounts are integer minor units (HKD cents).

export interface RefundResult {
  refundedMinor: number; // new running total after this refund
  status: 'refunded' | 'partially_refunded';
}

/** Validate and apply a refund against the captured total; returns the new running total + status. */
export function computeRefund(
  capturedMinor: number,
  alreadyRefundedMinor: number,
  requestMinor: number,
): RefundResult {
  if (!Number.isInteger(requestMinor) || requestMinor <= 0) {
    throw new Error(`invalid refund amount: ${requestMinor}`);
  }
  const total = alreadyRefundedMinor + requestMinor;
  if (total > capturedMinor) {
    throw new Error(`refund ${requestMinor} exceeds remaining ${capturedMinor - alreadyRefundedMinor}`);
  }
  return { refundedMinor: total, status: total === capturedMinor ? 'refunded' : 'partially_refunded' };
}
