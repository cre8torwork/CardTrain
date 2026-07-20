// Canonical Buy Points packages — the server-side source of truth for how much a
// package costs and how many CTP it grants. The browser sends only a package id +
// quantity; the amount is derived here and never trusted from the client.
// Keep in sync with the front-end display list in src/pages/buy-points/page.tsx.

import { toMinorUnits } from './money.ts';

export interface PointsPackage {
  id: string;
  hkd: number; // price in HKD dollars
  ctp: number; // points granted
}

export const POINTS_PACKAGES: readonly PointsPackage[] = [
  { id: 'pkg-50', hkd: 50, ctp: 500 },
  { id: 'pkg-100', hkd: 100, ctp: 1000 },
  { id: 'pkg-300', hkd: 300, ctp: 3000 },
  { id: 'pkg-500', hkd: 500, ctp: 5000 },
  { id: 'pkg-1000', hkd: 1000, ctp: 10000 },
  { id: 'pkg-3000', hkd: 3000, ctp: 30000 },
  { id: 'pkg-5000', hkd: 5000, ctp: 50000 },
];

const MAX_QUANTITY = 100;

/** Resolve a package id + quantity to the charge amount (minor units) and CTP granted. */
export function resolvePackage(id: string, quantity: number): { amountMinor: number; ctp: number } {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error(`invalid quantity: ${quantity}`);
  }
  const pkg = POINTS_PACKAGES.find((p) => p.id === id);
  if (!pkg) throw new Error(`unknown package: ${id}`);
  return { amountMinor: toMinorUnits(pkg.hkd * quantity), ctp: pkg.ctp * quantity };
}
