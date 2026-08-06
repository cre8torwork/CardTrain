// oapm-checkout — creates an OAPM Sale (PreOrder) request for an existing order,
// re-deriving the amount server-side, and returns the pay_apptrade URL the browser
// redirects to (WEB: QR page in the same tab; WAP: app deep-link).
//
// Signing is byte-verified against a live EFT response (see
// _shared/payments/oapm-sign.ts, 2026-08-04).
//
// BUG FIXED 2026-08-04: `time` was generated in plain UTC instead of Beijing/HK
// time (UTC+8) — see oapm-fields.ts `oapmTimeNow`. This is the confirmed root
// cause of real Sale requests through this app being rejected by EFT (non-2xx
// from this function) while an identical-shape manual Postman call succeeded —
// our timestamp was landing 8 hours "in the past" relative to what EFT's server
// expects as current time.
//
// return_url note (corrected 2026-08-04): the design spec assumed return_url
// carries no parameters (per EFT's docs). A live redirect showed EFT DOES append
// the full signed trade_status_sync payload as query params on return — same
// shape as the notify webhook. We don't rely on this (oapm-notify/oapm-query stay
// the source of truth — a browser redirect is still not proof of payment on its
// own without verifying that signature), but /oapm-return could read+verify it
// for an instant result instead of waiting on the query poll. Not yet done.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signOapmFields } from "../_shared/payments/oapm-sign.ts";
import {
  saleServiceFor,
  payTypeForWallet,
  buyerTypeFromUserAgent,
  effectiveOapmPayScene,
  oapmTimeNow,
  VALID_OAPM_WALLETS,
  type OapmWallet,
} from "../_shared/payments/oapm-fields.ts";
import { formatMinorUnits } from "../_shared/payments/money.ts";
import { corsHeaders } from "../_shared/payments/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OAPM_USER_CONFIRM_KEY = Deno.env.get("OAPM_USER_CONFIRM_KEY")!;
const OAPM_SECRET = Deno.env.get("OAPM_SECRET")!;
// e.g. https://oapm.eftpay.com.hk/OAPM/v1/Servlet/ — production only, no sandbox.
const OAPM_BASE_URL = Deno.env.get("OAPM_BASE_URL")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://cardtrain.com";

// Stable for the order's life (unlike CyberSource's per-attempt reference_number)
// — used for Query/Refund lookups (design spec §4 note). Derived from the order
// id, so it's already unique without a DB round trip.
function outTradeNoFor(orderId: string): string {
  return `CT${orderId.replace(/-/g, "").slice(0, 24)}`;
}


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
    const { orderId, wallet, payScene } = (await req.json()) as {
      orderId?: string;
      wallet?: string;
      payScene?: string;
    };
    if (!orderId) return json({ error: "missing orderId" }, 400);
    if (!VALID_OAPM_WALLETS.includes(wallet as OapmWallet)) {
      return json({ error: "invalid wallet" }, 400);
    }
    if (payScene !== undefined && payScene !== "WEB" && payScene !== "WAP") {
      return json({ error: "invalid payScene" }, 400);
    }
    // A mobile customer must ALWAYS get the app-redirect (H5) flow, even when the
    // browser-side detection fails (stale cached bundle, desktop-mode UA) — so the
    // wire scene is WAP if either the client or the server-seen UA says mobile.
    const effectiveScene = effectiveOapmPayScene(payScene, req.headers.get("user-agent") || "");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Re-derive the amount from our own order — never sign an amount the browser sent.
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, kind, amount_minor, currency, status")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return json({ error: "order not found" }, 404);
    if (!["created", "pending", "declined", "error"].includes(order.status)) {
      return json({ error: `order not payable (${order.status})` }, 409);
    }

    const walletTyped = wallet as OapmWallet;
    const payType = payTypeForWallet(walletTyped);
    const service = saleServiceFor(payType, effectiveScene);
    const buyerType = buyerTypeFromUserAgent(req.headers.get("user-agent") || "");
    const outTradeNo = outTradeNoFor(order.id);
    const subject =
      order.kind === "shop_goods" ? "Card Train - Shop order" : "Card Train - Points top-up";

    const fields: Record<string, string> = {
      service,
      user_confirm_key: OAPM_USER_CONFIRM_KEY,
      transaction_amount: formatMinorUnits(order.amount_minor),
      out_trade_no: outTradeNo,
      payType,
      buyerType,
      subject,
      wallet: walletTyped,
      pay_scene: effectiveScene,
      notify_url: `${SUPABASE_URL}/functions/v1/oapm-notify`,
      return_url: `${SITE_URL}/oapm-return`,
      // Payment-link validity. EFT's default is 1800s (30 min); 5 minutes is
      // enough for any real top-up and lets an abandoned/cancelled payment reach
      // its terminal TRADE_CLOSED quickly — which the return page polls for, and
      // which the EFT test plan's timeout fail case requires us to display.
      active_time: "300",
      time: oapmTimeNow(),
    };
    fields.sign = await signOapmFields(fields, OAPM_SECRET);

    // Real production HTTP call — never exercised during this build (no sandbox
    // exists; see the module header). Correct-by-review, not by test.
    const endpoint = `${OAPM_BASE_URL.replace(/\/$/, "")}/JSAPIService.do`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const reply = await res.json();

    if (reply.return_status !== "00") {
      await supabase.from("payment_events").insert({
        order_id: order.id,
        type: "error",
        amount_minor: order.amount_minor,
        actor: "system",
        detail: { gateway: "oapm", stage: "sale_request", reply },
      });
      // A rejected Sale is a payment DECLINE, not a system error: mark the order
      // declined (a payable status — the customer can retry) and tell the browser
      // to route to the failure page, which displays the clear "Transaction
      // Failed" message EFT's test plan requires — never the raw gateway string.
      // EFT's error text is in return_char (code in return_status; no `message`
      // field exists) — kept in the response for logs/debugging only.
      await supabase
        .from("orders")
        .update({
          status: "declined",
          gateway: "oapm",
          oapm_out_trade_no: outTradeNo,
          oapm_wallet: walletTyped,
          oapm_pay_scene: effectiveScene,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      const reason = [reply.return_status, reply.return_char].filter(Boolean).join(" ");
      return json({ declined: true, reason: reason || "OAPM Sale request rejected" }, 200);
    }

    await supabase
      .from("orders")
      .update({
        status: "pending",
        gateway: "oapm",
        oapm_out_trade_no: outTradeNo,
        oapm_wallet: walletTyped,
        oapm_pay_scene: effectiveScene,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    await supabase.from("payment_events").insert({
      order_id: order.id,
      type: "sign",
      amount_minor: order.amount_minor,
      actor: "system",
      detail: {
        gateway: "oapm",
        service,
        wallet: walletTyped,
        pay_scene: effectiveScene,
        eft_trade_no: reply.eft_trade_no ?? null,
      },
    });

    return json({ payApptrade: reply.pay_apptrade, outTradeNo }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
