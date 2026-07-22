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

/** Submit an Apple Pay token for an order. Backend is pending the wallet certs. */
export async function submitApplePay(orderId: string, token: unknown): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('apple-pay', {
    body: { orderId, token },
  });
  if (error) return { ok: false, message: error.message ?? 'Apple Pay failed' };
  const d = data as { ok?: boolean; message?: string; error?: string };
  return { ok: !!d?.ok, message: d?.message ?? d?.error ?? '' };
}

/** CyberSource card_type code for the networks this MID accepts (Visa 001, Mastercard 002). */
export function detectCardType(cardNumber: string): string | undefined {
  const n = cardNumber.replace(/\D/g, '');
  if (/^4/.test(n)) return '001';
  if (/^(5[1-5]|2[2-7])/.test(n)) return '002';
  return undefined;
}
