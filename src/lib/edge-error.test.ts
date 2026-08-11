import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgeErrorMessage } from './edge-error.ts';

const GENERIC = 'Edge Function returned a non-2xx status code';

test("reads the function's real message from a Response context (supabase-js v2)", async () => {
  const err = {
    message: GENERIC,
    context: new Response(JSON.stringify({ error: 'UnionPay is not configured: set CYBS_SA_CUP_PROFILE_ID' }), {
      status: 503,
    }),
  };
  assert.equal(await edgeErrorMessage(err), 'UnionPay is not configured: set CYBS_SA_CUP_PROFILE_ID');
});

test('reads it from a JSON-string context too', async () => {
  const err = { message: GENERIC, context: JSON.stringify({ error: 'order not found' }) };
  assert.equal(await edgeErrorMessage(err), 'order not found');
});

test('accepts `message` as well as `error` in the body', async () => {
  const err = { message: GENERIC, context: new Response(JSON.stringify({ message: 'nope' }), { status: 400 }) };
  assert.equal(await edgeErrorMessage(err), 'nope');
});

test('falls back to the generic message when the body has nothing useful', async () => {
  const err = { message: GENERIC, context: new Response('<html>gateway error</html>', { status: 502 }) };
  assert.equal(await edgeErrorMessage(err), GENERIC);
});

test('never throws on a missing or malformed error', async () => {
  assert.equal(await edgeErrorMessage(null), 'Payment could not be started. Please try again.');
  assert.equal(await edgeErrorMessage({}), 'Payment could not be started. Please try again.');
  assert.equal(await edgeErrorMessage({ context: 123 as unknown }), 'Payment could not be started. Please try again.');
});

test('does not consume the body — a second read still works', async () => {
  // We clone before reading; callers may still inspect the response.
  const res = new Response(JSON.stringify({ error: 'boom' }), { status: 500 });
  assert.equal(await edgeErrorMessage({ context: res }), 'boom');
  assert.deepEqual(await res.json(), { error: 'boom' });
});
