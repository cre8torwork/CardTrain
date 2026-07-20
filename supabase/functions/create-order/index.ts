// create-order — creates a Buy Points order before checkout. The amount is
// derived server-side from the canonical package list; the browser sends only a
// package id + quantity.
//
// ⚠️ PENDING SANDBOX VERIFICATION (needs DB). Logic is straightforward; the
// package math is unit-tested in _shared/payments/packages.test.ts.

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

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Require an authenticated user — orders belong to a user.
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) return json({ error: "unauthorized" }, 401);

    const { packageId, quantity } = await req.json();
    let amountMinor: number, ctp: number;
    try {
      ({ amountMinor, ctp } = resolvePackage(packageId, quantity));
    } catch (e) {
      return json({ error: String((e as Error).message) }, 400);
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        kind: "buy_points",
        amount_minor: amountMinor,
        currency: "HKD",
        status: "created",
        mid: CARDS_MID,
        ctp_amount: ctp,
      })
      .select("id")
      .single();
    if (error) throw error;

    return json({ orderId: order.id }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
