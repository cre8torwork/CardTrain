import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  buildAsciiParamString,
  sha256Hex,
  signOapmFields,
  verifyOapmSignature,
} from './oapm-sign.ts';

test('buildAsciiParamString sorts keys ASCII order, excludes sign, no leading/trailing &', () => {
  const fields = {
    out_trade_no: '123',
    service: 'service.alipay.web.PreOrder',
    sign: 'ignored',
    amount: '10.00',
  };
  assert.equal(
    buildAsciiParamString(fields),
    'amount=10.00&out_trade_no=123&service=service.alipay.web.PreOrder',
  );
});

test('buildAsciiParamString handles a single field with no separator', () => {
  assert.equal(buildAsciiParamString({ out_trade_no: '123' }), 'out_trade_no=123');
});

test('sha256Hex matches a Node crypto known-answer (cross-impl check)', async () => {
  const data = 'secret123amount=10.00&out_trade_no=123';
  const expected = createHash('sha256').update(data, 'utf8').digest('hex');
  assert.equal(await sha256Hex(data), expected);
});

test('signOapmFields = SHA256(secret_code + asciiParamString), no delimiter before secret_code', async () => {
  const fields = { out_trade_no: '123', amount: '10.00' };
  const secret = 'shhh';
  const expected = createHash('sha256')
    .update(`${secret}amount=10.00&out_trade_no=123`, 'utf8')
    .digest('hex');
  assert.equal(await signOapmFields(fields, secret), expected);
});

test('verifyOapmSignature accepts a self-signed field set', async () => {
  const secret = 'shhh';
  const fields: Record<string, string> = {
    out_trade_no: '123',
    amount: '10.00',
    trade_status: 'TRADE_SUCCESS',
  };
  fields.sign = await signOapmFields(fields, secret);
  assert.equal(await verifyOapmSignature(fields, secret), true);
});

test('verifyOapmSignature rejects a tampered field (e.g. amount)', async () => {
  const secret = 'shhh';
  const fields: Record<string, string> = { out_trade_no: '123', amount: '10.00' };
  fields.sign = await signOapmFields(fields, secret);
  const tampered = { ...fields, amount: '9999.00' };
  assert.equal(await verifyOapmSignature(tampered, secret), false);
});

test('verifyOapmSignature rejects a tampered trade_status (notify forgery)', async () => {
  const secret = 'shhh';
  const fields: Record<string, string> = { out_trade_no: '123', trade_status: 'TRADE_FAIL' };
  fields.sign = await signOapmFields(fields, secret);
  const tampered = { ...fields, trade_status: 'TRADE_SUCCESS' };
  assert.equal(await verifyOapmSignature(tampered, secret), false);
});

test('verifyOapmSignature rejects a wrong secret', async () => {
  const secret = 'shhh';
  const fields: Record<string, string> = { out_trade_no: '123' };
  fields.sign = await signOapmFields(fields, secret);
  assert.equal(await verifyOapmSignature(fields, 'other-secret'), false);
});

test('verifyOapmSignature rejects a missing sign field', async () => {
  assert.equal(await verifyOapmSignature({ out_trade_no: '123' }, 'shhh'), false);
});
