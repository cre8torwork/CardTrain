// oapm-checkout — creates an OAPM Sale (PreOrder) request for an existing order,
// re-deriving the amount server-side, and returns the pay_apptrade URL the browser
// redirects to (WEB: QR page in the same tab; WAP: app deep-link).
//
// ⚠️ PENDING LIVE VERIFICATION: OAPM has no sandbox — the fetch() call below is
// real production money the first time it runs. The signing algorithm's exact
// digest encoding is unverified (see _shared/payments/oapm-sign.ts). This function
// is NEVER exercised against oapm.eftpay.com.hk during development/tests — the
// first live call is a deliberate, owner-supervised step (design spec §7, §10).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signOapmFields } from "../_shared/payments/oapm-sign.ts";
import {
  saleServiceFor,
  payTypeForWallet,
  buyerTypeFromUserAgent,
  VALID_OAPM_WALLETS,
  type OapmWallet,
  type OapmPayScene,
} from "../_shared/payments/oapm-fields.ts";
import { formatMinorUnits } from "../_shared/payments/money.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OAPM_USER_CONFIRM_KEY = Deno.env.get("OAPM_USER_CONFIRM_KEY")!;
const OAPM_SECRET = Deno.env.get("OAPM_SECRET")!;
// e.g. https://oapm.eftpay.com.hk/OAPM/v1/Servlet/ — production only, no sandbox.
const OAPM_BASE_URL = Deno.env.get("OAPM_BASE_URL")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://cardtrain.com";

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

// Stable for the order's life (unlike CyberSource's per-attempt reference_number)
// — used for Query/Refund lookups (design spec §4 note). Derived from the order
// id, so it's already unique without a DB round trip.
function outTradeNoFor(orderId: string): string {
  return `CT${orderId.replace(/-/g, "").slice(0, 24)}`;
}

// yyyyMMddHHmmss (UTC). EFT's docs don't state a timezone; UTC is the
// documented-safe default until byte-verified against a live response.
function oapmTimeNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
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
    if (payScene !== "WEB" && payScene !== "WAP") {
      return json({ error: "invalid payScene" }, 400);
    }

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
    const service = saleServiceFor(payType, payScene as OapmPayScene);
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
      pay_scene: payScene as string,
      notify_url: `${SUPABASE_URL}/functions/v1/oapm-notify`,
      return_url: `${SITE_URL}/oapm-return`,
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
      return json({ error: reply.message || "OAPM Sale request rejected" }, 502);
    }

    await supabase
      .from("orders")
      .update({
        status: "pending",
        gateway: "oapm",
        oapm_out_trade_no: outTradeNo,
        oapm_wallet: walletTyped,
        oapm_pay_scene: payScene,
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
        pay_scene: payScene,
        eft_trade_no: reply.eft_trade_no ?? null,
      },
    });

    return json({ payApptrade: reply.pay_apptrade, outTradeNo }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
