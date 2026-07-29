import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  payTypeForWallet,
  saleServiceFor,
  buyerTypeFromUserAgent,
  paySceneFromUserAgent,
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

test('saleServiceFor: WeChat WAP is the irregular MobileH5 value (known gap #1 regression guard)', () => {
  assert.equal(saleServiceFor('WeChat', 'WAP'), 'service.wechat.web.MobileH5');
  // Explicitly not the naive pattern-matched value — this is the bug EFT's own
  // Postman sample has (defaults pay_scene to "WEB" and never exercises this path).
  assert.notEqual(saleServiceFor('WeChat', 'WAP'), 'service.wechat.wap.PreOrder');
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
