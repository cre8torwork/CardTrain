// Which CyberSource merchant account (and therefore which Secure Acceptance
// profile + keys) processes a given card network.
//
// Card Train has TWO card merchant IDs:
//   gphk088034609200 — Visa + Mastercard   (CYBS_SA_*)
//   gphk088034609204 — China UnionPay      (CYBS_SA_CUP_*)
//
// A Secure Acceptance profile belongs to one merchant ID, so each MID has its own
// Profile ID / Access Key / Secret Key. Signing a card with the WRONG merchant's
// profile is rejected with reason_code 102 ("This card is not supported by the
// processor.: card_type") — and because 102 is a validation reject, CyberSource
// creates no transaction, so it cannot even be traced in the Business Center.
// That is why an unidentified network falls back to the default merchant and a
// missing UnionPay configuration throws loudly instead of quietly mis-routing.
//
// The MID that took the payment is recorded on the order: refunds and every other
// follow-on MUST go back through the same merchant.

export const CARD_NETWORK = {
  visa: "visa",
  mastercard: "mastercard",
  unionPay: "unionpay",
} as const;

export type CardNetwork = (typeof CARD_NETWORK)[keyof typeof CARD_NETWORK];

/**
 * Which Secure Acceptance integration drives a profile. This is NOT a style
 * choice — CyberSource records it against every transaction as the "Client
 * Application" in the Business Center, and GPAP requires UnionPay to read
 * "Secure Acceptance Hosted Checkout", not "Secure Acceptance SOP".
 *
 * The endpoint IS the method:
 *   checkout_api -> /silent/pay  we collect the card; it posts straight to CyberSource
 *   hosted       -> /pay         CyberSource collects the card on its own page
 */
export type Integration = "checkout_api" | "hosted";

export interface Merchant {
  merchantId: string;
  profileId: string;
  accessKey: string;
  secretKey: string;
  /** Where this merchant's signed form must be POSTed. */
  endpoint: string;
  integration: Integration;
}

/**
 * Both integrations sit on the same host and differ only by path, so the hosted
 * endpoint is derived rather than requiring a second env var to be set correctly on
 * every deployment. An explicit CYBS_SA_CUP_ENDPOINT still wins.
 */
export function hostedEndpointFrom(checkoutApiEndpoint: string): string {
  return checkoutApiEndpoint.replace(/\/silent\/pay\/?$/, "/pay");
}

/** Env lookup, injectable so this is testable without Deno. */
export type EnvMap = Record<string, string | undefined>;

const DEFAULT_CARDS_MID = "gphk088034609200";
const UNIONPAY_MID = "gphk088034609204";

/** CyberSource card_type code -> network. Unknown codes use the default merchant. */
export function networkForCardType(cardType: string): CardNetwork {
  if (cardType === "002") return CARD_NETWORK.mastercard;
  if (cardType === "062") return CARD_NETWORK.unionPay;
  return CARD_NETWORK.visa; // 001 and anything unrecognised
}

export function merchantForNetwork(network: CardNetwork, env: EnvMap): Merchant {
  const checkoutApiEndpoint = env.CYBS_SA_ENDPOINT ?? "";
  if (network === CARD_NETWORK.unionPay) {
    const profileId = env.CYBS_SA_CUP_PROFILE_ID ?? "";
    const accessKey = env.CYBS_SA_CUP_ACCESS_KEY ?? "";
    const secretKey = env.CYBS_SA_CUP_SECRET_KEY ?? "";
    if (!profileId || !accessKey || !secretKey) {
      throw new Error(
        "UnionPay is not configured: set CYBS_SA_CUP_PROFILE_ID / _ACCESS_KEY / _SECRET_KEY " +
          `for MID ${UNIONPAY_MID}`,
      );
    }
    return {
      merchantId: env.CYBS_SA_CUP_MERCHANT_ID || UNIONPAY_MID,
      profileId,
      accessKey,
      secretKey,
      // GPAP requires this merchant to run Hosted Checkout. Sharing the Visa/MC
      // endpoint is what made EBC log it as "Secure Acceptance SOP".
      endpoint: env.CYBS_SA_CUP_ENDPOINT || hostedEndpointFrom(checkoutApiEndpoint),
      integration: "hosted",
    };
  }
  return {
    merchantId: env.CYBS_SA_MERCHANT_ID || DEFAULT_CARDS_MID,
    profileId: env.CYBS_SA_PROFILE_ID ?? "",
    accessKey: env.CYBS_SA_ACCESS_KEY ?? "",
    secretKey: env.CYBS_SA_SECRET_KEY ?? "",
    endpoint: checkoutApiEndpoint,
    integration: "checkout_api",
  };
}

/** Every merchant that actually has credentials configured. Never throws. */
export function configuredMerchants(env: EnvMap): Merchant[] {
  const checkoutApiEndpoint = env.CYBS_SA_ENDPOINT ?? "";
  const out: Merchant[] = [];
  if (env.CYBS_SA_PROFILE_ID && env.CYBS_SA_SECRET_KEY) {
    out.push({
      merchantId: env.CYBS_SA_MERCHANT_ID || DEFAULT_CARDS_MID,
      profileId: env.CYBS_SA_PROFILE_ID,
      accessKey: env.CYBS_SA_ACCESS_KEY ?? "",
      secretKey: env.CYBS_SA_SECRET_KEY,
      endpoint: checkoutApiEndpoint,
      integration: "checkout_api",
    });
  }
  if (env.CYBS_SA_CUP_PROFILE_ID && env.CYBS_SA_CUP_SECRET_KEY) {
    out.push({
      merchantId: env.CYBS_SA_CUP_MERCHANT_ID || UNIONPAY_MID,
      profileId: env.CYBS_SA_CUP_PROFILE_ID,
      accessKey: env.CYBS_SA_CUP_ACCESS_KEY ?? "",
      secretKey: env.CYBS_SA_CUP_SECRET_KEY,
      endpoint: env.CYBS_SA_CUP_ENDPOINT || hostedEndpointFrom(checkoutApiEndpoint),
      integration: "hosted",
    });
  }
  return out;
}

/**
 * Match an inbound CyberSource response back to the merchant that signed it,
 * using `req_profile_id` from the response.
 *
 * checkout-response MUST verify with the same secret CyberSource signed with.
 * Verifying a UnionPay response against the …200 secret fails, and the customer
 * is told "We could not verify this transaction" AFTER their card was charged —
 * the money moves but the order never completes.
 */
export function merchantForProfileId(profileId: string, env: EnvMap): Merchant | null {
  if (!profileId) return null;
  return configuredMerchants(env).find((m) => m.profileId === profileId) ?? null;
}
