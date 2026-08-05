import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  payTypeForWallet,
  saleServiceFor,
  buyerTypeFromUserAgent,
  paySceneFromUserAgent,
  oapmTimeNow,
  REFUND_SERVICE,
  VALID_OAPM_WALLETS,
} from './oapm-fields.ts';

test('payTypeForWallet maps ALIPAYHK/ALIPAYCN to Alipay, WECHATCN to WeChat', () => {
  assert.equal(payTypeForWallet('ALIPAYHK'), 'Alipay');
  assert.equal(payTypeForWallet('ALIPAYCN'), 'Alipay');
  assert.equal(payTypeForWallet('WECHATCN'), 'WeChat');
});

test('saleServiceFor: regular Alipay WEB/WAP pattern', () => {
  assert.equal(saleServiceFor('Alipay', 'WEB'), 'service.alipay.web.PreOrder');
  assert.equal(saleServiceFor('Alipay', 'WAP'), 'service.alipay.wap.PreOrder');
});

test('saleServiceFor: regular WeChat WEB pattern', () => {
  assert.equal(saleServiceFor('WeChat', 'WEB'), 'service.wechat.web.PreOrder');
});

test('saleServiceFor: WeChat WAP falls back to Native/QR while H5 is not entitled', () => {
  // EFT has not enabled the WeChat H5 product for our sub-merchant: MobileH5 is
  // accepted by the Sale API but the payment page fails NO_AUTH (probed live
  // 2026-08-05, both WECHATCN and WECHATHK). PreOrder is entitled and works, so
  // WeChat WAP routes there until WECHAT_H5_ENTITLED flips.
  assert.equal(saleServiceFor('WeChat', 'WAP'), 'service.wechat.web.PreOrder');
});

test('saleServiceFor: never emits a service string the gateway rejects', () => {
  // The Sale API recognises exactly two WeChat services; everything else is
  // `-13 Invalid service`. Guards every combination against a typo'd product.
  const VALID_WECHAT = ['service.wechat.web.PreOrder', 'service.wechat.web.MobileH5'];
  for (const scene of ['WEB', 'WAP'] as const) {
    assert.ok(
      VALID_WECHAT.includes(saleServiceFor('WeChat', scene)),
      `WeChat/${scene} produced an unrecognised service: ${saleServiceFor('WeChat', scene)}`,
    );
  }
  // Alipay is entitled on both scenes and follows the regular pattern.
  assert.equal(saleServiceFor('Alipay', 'WEB'), 'service.alipay.web.PreOrder');
  assert.equal(saleServiceFor('Alipay', 'WAP'), 'service.alipay.wap.PreOrder');
});

test('REFUND_SERVICE defaults to the field-table value, not the docs example value', () => {
  assert.equal(REFUND_SERVICE, 'service.common.Refund');
});

test('buyerTypeFromUserAgent classifies iOS, Android, and everything else', () => {
  assert.equal(
    buyerTypeFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'),
    'ios',
  );
  assert.equal(buyerTypeFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'ios');
  assert.equal(
    buyerTypeFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)'),
    'android',
  );
  assert.equal(
    buyerTypeFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
    'others',
  );
  assert.equal(buyerTypeFromUserAgent(''), 'others');
});

test('paySceneFromUserAgent: mobile UAs get WAP, desktop UAs get WEB', () => {
  assert.equal(paySceneFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'WAP');
  assert.equal(
    paySceneFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'),
    'WAP',
  );
  assert.equal(
    paySceneFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
    'WEB',
  );
});

test('VALID_OAPM_WALLETS lists exactly the three wallets in scope (WECHATHK excluded — open question §9)', () => {
  assert.deepEqual([...VALID_OAPM_WALLETS].sort(), ['ALIPAYCN', 'ALIPAYHK', 'WECHATCN']);
});

test('oapmTimeNow is Beijing/HK time (UTC+8), not UTC — regression guard for the 2026-08-04 rejection bug', () => {
  // 2026-08-04 00:00:00 UTC -> 2026-08-04 08:00:00 Beijing/HK time
  assert.equal(oapmTimeNow(new Date('2026-08-04T00:00:00.000Z')), '20260804080000');
  // Crosses a calendar day: 2026-08-04 20:00:00 UTC -> 2026-08-05 04:00:00 Beijing/HK
  assert.equal(oapmTimeNow(new Date('2026-08-04T20:00:00.000Z')), '20260805040000');
});

test('oapmTimeNow matches the real live payload from the 2026-08-04 test (given=UTC+8, not the UTC time our old bug would have sent)', () => {
  // The verified live redirect (see oapm-sign.test.ts) had time=20260804105601 —
  // that request left our servers with the OLD (buggy, UTC) implementation,
  // meaning the corresponding real UTC instant was ~08 hours earlier than what
  // "20260804105601" would mean if read as Beijing time. This test just pins the
  // conversion direction so a future edit can't silently flip the sign again.
  const utcInstant = new Date('2026-08-04T02:56:01.000Z'); // 10:56:01 UTC+8
  assert.equal(oapmTimeNow(utcInstant), '20260804105601');
});
