// create-order — creates a payment order before checkout. Two kinds:
//   buy_points: browser sends packageId + quantity; amount from the canonical
//               package list (a Sale).
//   shop_goods: browser sends items + shipping; amount from each product's
//               hkd_price_minor (an Authorization, captured on shipment).
// The amount is ALWAYS derived server-side; the browser never sends a price.
//
// ⚠️ PENDING SANDBOX VERIFICATION (needs DB). Package math is unit-tested
// (_shared/payments/packages.test.ts).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolvePackage } from "../_shared/payments/packages.ts";

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
    const kind = body.kind === "shop_goods" ? "shop_goods" : "buy_points";

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
