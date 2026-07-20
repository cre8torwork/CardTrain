// Order state machine for back-office money operations. Guards which actions are
// legal from which status, so we never (e.g.) capture a declined order or refund
// an authorization. Refund status transitions live in refunds.ts.

export type OrderStatus =
  | 'created' | 'pending' | 'paid' | 'authorized' | 'declined' | 'error'
  | 'captured' | 'voided' | 'reversed' | 'refunded' | 'partially_refunded';

export type BackOfficeAction = 'capture' | 'void' | 'reversal' | 'refund';

// Which statuses each action may be applied from.
const ALLOWED_FROM: Record<BackOfficeAction, OrderStatus[]> = {
  capture: ['authorized'],
  void: ['authorized', 'paid'], // cancel before settlement
  reversal: ['authorized'], // release an auth hold before capture
  refund: ['captured', 'paid', 'partially_refunded'], // return money after settlement
};

// The resulting status for the single-step actions (refund is handled by refunds.ts).
const RESULT: Record<Exclude<BackOfficeAction, 'refund'>, OrderStatus> = {
  capture: 'captured',
  void: 'voided',
  reversal: 'reversed',
};

export function canApply(action: BackOfficeAction, status: OrderStatus): boolean {
  return ALLOWED_FROM[action].includes(status);
}

export function assertCanApply(action: BackOfficeAction, status: OrderStatus): void {
  if (!canApply(action, status)) {
    throw new Error(`cannot ${action} an order in status "${status}"`);
  }
}

export function statusAfter(action: Exclude<BackOfficeAction, 'refund'>): OrderStatus {
  return RESULT[action];
}
