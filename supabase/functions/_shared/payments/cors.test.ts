import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corsHeaders, isAllowedOrigin } from './cors.ts';

test('production domains are allowed and echoed back exactly', () => {
  for (const o of [
    'https://cardtrain.net',
    'https://www.cardtrain.net',
    'https://cardtrain.com',
    'https://www.cardtrain.com',
  ]) {
    assert.equal(isAllowedOrigin(o), true, o);
    assert.equal(corsHeaders(o)['Access-Control-Allow-Origin'], o, o);
  }
});

test('localhost is allowed on ANY port — incl. vite preview 4173', () => {
  for (const o of [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173', // vite preview — the port that broke card payments
    'http://127.0.0.1:8080',
  ]) {
    assert.equal(isAllowedOrigin(o), true, o);
    assert.equal(corsHeaders(o)['Access-Control-Allow-Origin'], o, o);
  }
});

test('Readdy preview/builder subdomains are allowed', () => {
  for (const o of ['https://readdy.ai', 'https://preview.readdy.ai', 'https://abc123.readdy.ai']) {
    assert.equal(isAllowedOrigin(o), true, o);
  }
});

test('look-alike domains are NOT allowed (anchored, no substring matching)', () => {
  for (const o of [
    'https://cardtrain.net.evil.com',
    'https://evil-cardtrain.net',
    'https://readdy.ai.evil.com',
    'https://notreaddy.ai',
  ]) {
    assert.equal(isAllowedOrigin(o), false, o);
  }
});

test('a disallowed origin never receives a MISMATCHED allow-origin header', () => {
  // The original bug: falling back to ALLOWED_ORIGINS[0] returned
  // "https://cardtrain.com" to every unknown caller, so the browser blocked the
  // request and supabase-js reported "Failed to send a request to the Edge Function".
  const h = corsHeaders('https://evil.example');
  assert.equal(h['Access-Control-Allow-Origin'], undefined);
});

test('missing/empty origin (curl, server-to-server) does not throw', () => {
  assert.doesNotThrow(() => corsHeaders(''));
  assert.doesNotThrow(() => corsHeaders(null));
});
