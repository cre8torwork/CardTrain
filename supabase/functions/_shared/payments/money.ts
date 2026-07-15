// HKD money helpers. Amounts move through the system as integer minor units
// (cents); we convert to a decimal string only at the display edge.

/** Convert HKD dollars (may include cents) to integer minor units (cents). */
export function toMinorUnits(hkd: number): number {
  if (!Number.isFinite(hkd) || hkd < 0) {
    throw new Error(`invalid HKD amount: ${hkd}`);
  }
  return Math.round(hkd * 100);
}

/** Render integer minor units as a 2-decimal HKD string (no currency symbol). */
export function formatMinorUnits(minor: number): string {
  return (minor / 100).toFixed(2);
}

/** CTP points earned for a HKD-dollar top-up (1 HKD = 10 CTP). */
export function ctpForHkd(hkd: number): number {
  return hkd * 10;
}
