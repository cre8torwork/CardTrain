// Pure request-field derivation for OAPM Sale/Refund — no network, no Deno APIs.
// Encodes the "known gaps" the design spec flags (§8) so they live in one place
// with a comment trail, instead of being re-discovered inside an edge function.

export type OapmWallet = 'ALIPAYHK' | 'ALIPAYCN' | 'WECHATCN';
export type OapmPayType = 'Alipay' | 'WeChat';
export type OapmPayScene = 'WEB' | 'WAP';
export type OapmBuyerType = 'ios' | 'android' | 'others';

export const VALID_OAPM_WALLETS: readonly OapmWallet[] = ['ALIPAYHK', 'ALIPAYCN', 'WECHATCN'];

/** ALIPAYHK/ALIPAYCN -> Alipay; WECHATCN -> WeChat. */
export function payTypeForWallet(wallet: OapmWallet): OapmPayType {
  return wallet.startsWith('ALIPAY') ? 'Alipay' : 'WeChat';
}

/**
 * The Sale `service` value. Known gap (design spec §8 #1): WeChat's WAP value is
 * the irregular `service.wechat.web.MobileH5` — NOT `service.wechat.wap.PreOrder`
 * (EFT's own WeChat-WAP Postman sample defaults `pay_scene` to "WEB" by mistake;
 * this function does not have that bug). Every other combination follows the
 * regular `service.<vendor>.<scene>.PreOrder` pattern.
 */
export function saleServiceFor(payType: OapmPayType, payScene: OapmPayScene): string {
  if (payType === 'WeChat' && payScene === 'WAP') return 'service.wechat.web.MobileH5';
  const vendor = payType === 'Alipay' ? 'alipay' : 'wechat';
  const scene = payScene === 'WAP' ? 'wap' : 'web';
  return `service.${vendor}.${scene}.PreOrder`;
}

/**
 * Known gap (design spec §8 #3): the field table says `service.common.Refund`;
 * the docs' own worked example uses `service.alipay.web.Refund`. Defaulting to the
 * field-table value (the more general, vendor-agnostic form) — confirm on the
 * first live refund call.
 */
export const REFUND_SERVICE = 'service.common.Refund';

/** Classify the caller's User-Agent for the required `buyerType` field (design spec §4 — required but absent from every Postman sample). */
export function buyerTypeFromUserAgent(userAgent: string): OapmBuyerType {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'others';
}

/** WEB vs WAP pay scene from the User-Agent — a build decision (design spec §9 open Q3), not a vendor requirement. */
export function paySceneFromUserAgent(userAgent: string): OapmPayScene {
  return /mobile|android|iphone|ipad|ipod/i.test(userAgent) ? 'WAP' : 'WEB';
}
