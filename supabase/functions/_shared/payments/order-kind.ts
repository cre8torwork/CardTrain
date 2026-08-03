// How each order kind maps to a CyberSource transaction type and a success status.
//
// ⚠️ The bug this centralises away: sign-checkout and checkout-response each
// wrote `order.kind === "buy_points"`, so when `buy_points_custom` was added the
// custom-amount purchases silently fell into the SHOP GOODS path — submitted as
// an `authorization` (funds held but never captured) and, worse, never credited
// any CTP because the crediting branch had the same narrow check. Deriving both
// answers here means a new kind can only be added in one place.

/** Points top-ups are instant digital fulfilment — capture immediately, credit at once. */
export function isPointsPurchase(kind: string): boolean {
  return kind === "buy_points" || kind === "buy_points_custom";
}

/** Sale (auth+capture) for instant fulfilment; authorization for goods that ship later. */
export function transactionTypeFor(kind: string): "sale" | "authorization" {
  return isPointsPurchase(kind) ? "sale" : "authorization";
}

/** Order status after a successful payment. */
export function paidStatusFor(kind: string): "paid" | "authorized" {
  return isPointsPurchase(kind) ? "paid" : "authorized";
}
