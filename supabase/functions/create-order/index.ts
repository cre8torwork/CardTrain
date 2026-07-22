// create-order — creates a payment order before checkout. Three kinds:
//   buy_points: browser sends packageId + quantity; amount from the canonical
//               package list (a Sale).
//   buy_points_custom: browser sends ctp; server derives HKD amount (1 HKD = 10 CTP).
//   shop_goods: browser sends items + shipping; amount from each product's
//               hkd_price_minor (an Authorization, captured on shipment).
// The amount is ALWAYS derived server-side; the browser never sends a price.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Cards MID (Secure Acceptance Checkout API). Refunds must route back through it.
const CARDS_MID = "gphk088034609200";

const ALLOWED_ORIGINS = [
  "https://cardtrain.com",
  "https://cardtrain.net",
  "https://www.cardtrain.com",
  "https://www.cardtrain.net",
  "http://localhost:5173",
  "http://localhost:3000",
];

// ── Inlined from _shared/payments/money.ts ──
function toMinorUnits(hkd: number): number {
  if (!Number.isFinite(hkd) || hkd < 0) {
    throw new Error(`invalid HKD amount: ${hkd}`);
  }
  return Math.round(hkd * 100);
}

// ── Inlined from _shared/payments/packages.ts ──
interface PointsPackage {
  id: string;
  hkd: number;
  ctp: number;
}

const POINTS_PACKAGES: readonly PointsPackage[] = [
  { id: 'pkg-50', hkd: 50, ctp: 500 },
  { id: 'pkg-100', hkd: 100, ctp: 1000 },
  { id: 'pkg-300', hkd: 300, ctp: 3000 },
  { id: 'pkg-500', hkd: 500, ctp: 5000 },
  { id: 'pkg-1000', hkd: 1000, ctp: 10000 },
  { id: 'pkg-3000', hkd: 3000, ctp: 30000 },
  { id: 'pkg-5000', hkd: 5000, ctp: 50000 },
];

function resolvePackage(id: string, quantity: number): { amountMinor: number; ctp: number } {
  const MAX_QUANTITY = 100;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error(`invalid quantity: ${quantity}`);
  }
  const pkg = POINTS_PACKAGES.find((p) => p.id === id);
  if (!pkg) throw new Error(`unknown package: ${id}`);
  return { amountMinor: toMinorUnits(pkg.hkd * quantity), ctp: pkg.ctp * quantity };
}

const corsHeaders = (origin: string) => {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

interface CartItemInput {
  productId: string;
  quantity: number;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();

    // Determine kind — default to buy_points for backward compat (no kind in body)
    let kind: string;
    if (body.kind === "shop_goods") kind = "shop_goods";
    else if (body.kind === "buy_points_custom") kind = "buy_points_custom";
    else kind = "buy_points";

    if (kind === "buy_points") {
      let amountMinor: number, ctp: number;
      try {
        ({ amountMinor, ctp } = resolvePackage(body.packageId, body.quantity));
      } catch (e) {
        return json({ error: String((e as Error).message) }, 400);
      }
      const { data: order, error } = await supabase
        .from("orders")
        .insert({ user_id: user.id, kind, amount_minor: amountMinor, currency: "HKD", status: "created", mid: CARDS_MID, ctp_amount: ctp })
        .select("id").single();
      if (error) throw error;
      return json({ orderId: order.id }, 200);
    }

    if (kind === "buy_points_custom") {
      const ctp = Number(body.ctp);
      if (!Number.isInteger(ctp) || ctp < 50 || ctp > 999990) {
        return json({ error: "CTP must be between 50 and 999,990" }, 400);
      }
      if (ctp % 10 !== 0) {
        return json({ error: "CTP must be a multiple of 10 (HK$1 = 10 CTP)" }, 400);
      }
      const hkd = ctp / 10;
      const amountMinor = toMinorUnits(hkd);
      const { data: order, error } = await supabase
        .from("orders")
        .insert({ user_id: user.id, kind: "buy_points_custom", amount_minor: amountMinor, currency: "HKD", status: "created", mid: CARDS_MID, ctp_amount: ctp })
        .select("id").single();
      if (error) throw error;
      return json({ orderId: order.id }, 200);
    }

    // shop_goods
    const items: CartItemInput[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return json({ error: "empty cart" }, 400);

    const ids = items.map((i) => i.productId);
    const { data: products, error: pErr } = await supabase
      .from("shop_products")
      .select("id, name, hkd_price_minor, is_active, stock")
      .in("id", ids);
    if (pErr) throw pErr;

    let amountMinor = 0;
    const snapshot: Array<{ productId: string; name: string; quantity: number; unitPriceMinor: number }> = [];
    for (const it of items) {
      const p = products?.find((x) => x.id === it.productId);
      const qty = Number(it.quantity);
      if (!p || !p.is_active) return json({ error: `product unavailable: ${it.productId}` }, 400);
      if (p.hkd_price_minor == null) return json({ error: `not available for card purchase: ${p.name}` }, 400);
      if (!Number.isInteger(qty) || qty < 1) return json({ error: "invalid quantity" }, 400);
      if (typeof p.stock === "number" && p.stock < qty) return json({ error: `insufficient stock: ${p.name}` }, 409);
      amountMinor += p.hkd_price_minor * qty;
      snapshot.push({ productId: p.id, name: p.name, quantity: qty, unitPriceMinor: p.hkd_price_minor });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        kind: "shop_goods",
        amount_minor: amountMinor,
        currency: "HKD",
        status: "created",
        mid: CARDS_MID,
        metadata: { items: snapshot, shipping: body.shipping ?? null },
      })
      .select("id").single();
    if (error) throw error;
    return json({ orderId: order.id }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
