import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmationFor, ISSUER_DECLINE_CODES } from './reason-codes.ts';

const REF = '0012345678';

test('reason code 100 is a success', () => {
  const c = confirmationFor(100, REF);
  assert.equal(c.category, 'success');
  assert.equal(c.message, `Transaction successful. (Reference Number: ${REF})`);
});

test('issuer decline codes map to the "contact your bank" message', () => {
  // GPAP: codes 201,203,204,205,208,210,211 are issuer-related (Case 3 wording).
  for (const code of [201, 203, 204, 205, 208, 210, 211]) {
    const c = confirmationFor(code, REF);
    assert.equal(c.category, 'issuer', `code ${code}`);
    assert.equal(
      c.message,
      `Transaction rejected, please contact your bank… (Reference Number: ${REF})`,
    );
  }
});

test('reason code 150 (system) maps to the "try again" message', () => {
  const c = confirmationFor(150, REF);
  assert.equal(c.category, 'retry');
  assert.equal(
    c.message,
    `Transaction unsuccessful, please try again... (Reference Number: ${REF})`,
  );
});

test('any other decline defaults to the "try again" message', () => {
  for (const code of [102, 202, 481, 999]) {
    assert.equal(confirmationFor(code, REF).category, 'retry', `code ${code}`);
  }
});

test('no message ever leaks sensitive wording (e.g. "Insufficient Fund")', () => {
  for (let code = 100; code <= 900; code++) {
    const msg = confirmationFor(code, REF).message.toLowerCase();
    assert.ok(!msg.includes('insufficient'), `code ${code} leaked wording`);
    assert.ok(!msg.includes('fraud'), `code ${code} leaked wording`);
  }
});

test('ISSUER_DECLINE_CODES is the exact GPAP set', () => {
  assert.deepEqual([...ISSUER_DECLINE_CODES].sort((a, b) => a - b), [
    201, 203, 204, 205, 208, 210, 211,
  ]);
});
