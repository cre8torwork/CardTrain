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

/** CyberSource card_type code for the networks this MID accepts (Visa 001, Mastercard 002). */
export function detectCardType(cardNumber: string): string | undefined {
  const n = cardNumber.replace(/\D/g, '');
  if (/^4/.test(n)) return '001';
  if (/^(5[1-5]|2[2-7])/.test(n)) return '002';
  return undefined;
}
