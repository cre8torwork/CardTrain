export { detectCardType, CARD_TYPE } from './card-networks';
import { supabase } from './supabase';

export interface SignedCheckout {
  endpoint: string;
  fields: Record<string, string>;
}

/** Create a Buy Points order server-side (amount derived from the package, not the client). */
export async function createBuyPointsOrder(packageId: string, quantity: number): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-order', {
    body: { packageId, quantity },
  });
  if (error) throw error;
  const orderId = (data as { orderId?: string })?.orderId;
  if (!orderId) throw new Error((data as { error?: string })?.error || 'Failed to create order');
  return orderId;
}

/** Create a custom-points order where the user types the CTP directly. */
export async function createCustomPointsOrder(ctp: number): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-order', {
    body: { kind: 'buy_points_custom', ctp },
  });
  if (error) throw error;
  const orderId = (data as { orderId?: string })?.orderId;
  if (!orderId) throw new Error((data as { error?: string })?.error || 'Failed to create order');
  return orderId;
}

export interface ShopShipping {
  recipientName: string;
  phone: string;
  flatFloor: string;
  building: string;
  address: string;
  district: string;
  notes: string;
}

/** Create a shop-goods order (card). Amount is derived server-side from each product's HKD price. */
export async function createShopCardOrder(
  items: { productId: string; quantity: number }[],
  shipping: ShopShipping,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-order', {
    body: { kind: 'shop_goods', items, shipping },
  });
  if (error) throw error;
  const orderId = (data as { orderId?: string })?.orderId;
  if (!orderId) throw new Error((data as { error?: string })?.error || 'Failed to create order');
  return orderId;
}

/** Get the server-signed Secure Acceptance field set for an order. */
export async function signCheckout(orderId: string): Promise<SignedCheckout> {
  const { data, error } = await supabase.functions.invoke('sign-checkout', {
    body: { orderId },
  });
  if (error) throw error;
  const d = data as { endpoint?: string; fields?: Record<string, string>; error?: string };
  if (!d?.endpoint || !d?.fields) throw new Error(d?.error || 'Failed to sign checkout');
  return { endpoint: d.endpoint, fields: d.fields };
}

/** Submit a Google Pay token for an order. Backend is pending the wallet certs. */
export async function submitGooglePay(orderId: string, token: string): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('google-pay', {
    body: { orderId, token },
  });
  if (error) {
    return { ok: false, message: error.message ?? 'Google Pay failed' };
  }
  const d = data as { ok?: boolean; message?: string; error?: string };
  return { ok: !!d?.ok, message: d?.message ?? d?.error ?? '' };
}

/** Apple Pay merchant validation — server calls Apple with the Merchant Identity cert. Pending certs. */
export async function validateApplePayMerchant(validationURL: string): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('apple-pay-validate', {
    body: { validationURL },
  });
  if (error) throw new Error(error.message ?? 'Apple Pay validation failed');
  const d = data as { merchantSession?: unknown; error?: string };
  if (!d?.merchantSession) throw new Error(d?.error ?? 'Apple Pay not available');
  return d.merchantSession;
}

/** Submit an Apple Pay payment for an order (token = base64 of token.paymentData). */
export async function submitApplePay(orderId: string, token: string, cardType: string): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('apple-pay', {
    body: { orderId, token, cardType },
  });
  if (error) return { ok: false, message: error.message ?? 'Apple Pay failed' };
  const d = data as { ok?: boolean; message?: string; error?: string };
  return { ok: !!d?.ok, message: d?.message ?? d?.error ?? '' };
}


// ── OAPM (Alipay CN/HK, WeChat Pay) ──
// Unlike the card + Apple/Google Pay flows, OAPM redirects the browser away to a
// QR/wallet page — there is no in-site confirmation, and return_url carries no
// parameters (design spec §4). Order state comes from oapm-notify (primary) or
// oapm-query (fallback), never from the browser.

export type OapmWallet = 'ALIPAYHK' | 'ALIPAYCN' | 'WECHATCN';
export type OapmPayScene = 'WEB' | 'WAP';

export interface OapmCheckout {
  payApptrade: string;
  outTradeNo: string;
}

/** WEB vs WAP — user-agent sniffing, the design spec's default (§9 open Q3). */
export function detectOapmPayScene(): OapmPayScene {
  return /mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent) ? 'WAP' : 'WEB';
}

/** Server-signs and submits the OAPM Sale request; returns the wallet redirect URL. */
export async function createOapmCheckout(
  orderId: string,
  wallet: OapmWallet,
  payScene: OapmPayScene,
): Promise<OapmCheckout> {
  const { data, error } = await supabase.functions.invoke('oapm-checkout', {
    body: { orderId, wallet, payScene },
  });
  if (error) throw error;
  const d = data as { payApptrade?: string; outTradeNo?: string; error?: string };
  if (!d?.payApptrade) throw new Error(d?.error || 'Failed to start OAPM checkout');
  return { payApptrade: d.payApptrade, outTradeNo: d.outTradeNo ?? '' };
}

/** Poll our own order status (kept current by oapm-notify / oapm-query) after a wallet redirect. */
export async function queryOapmOrder(orderId: string): Promise<{ status: string }> {
  const { data, error } = await supabase.functions.invoke('oapm-query', {
    body: { orderId },
  });
  if (error) throw error;
  const d = data as { status?: string; error?: string };
  if (!d?.status) throw new Error(d?.error || 'Failed to check order status');
  return { status: d.status };
}

const OAPM_PENDING_KEY = 'cardtrain_oapm_pending_order';

export interface OapmPendingOrder {
  orderId: string;
  successTo: string;
}

/** Remember which order we're paying before leaving the site for the wallet app/QR page. */
export function rememberOapmPendingOrder(pending: OapmPendingOrder): void {
  sessionStorage.setItem(OAPM_PENDING_KEY, JSON.stringify(pending));
}

/** Reads and clears the pending-order marker (one-shot — call once, on the return page). */
export function consumeOapmPendingOrder(): OapmPendingOrder | null {
  const raw = sessionStorage.getItem(OAPM_PENDING_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(OAPM_PENDING_KEY);
  try {
    return JSON.parse(raw) as OapmPendingOrder;
  } catch {
    return null;
  }
}
