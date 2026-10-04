import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createFateAccountRequests,
  FateCloudTimeout,
  requestFateJson,
} from '../lib/fate-cloud-client';

void test('cloud requests preserve safe transport options and report useful server failures', async () => {
  const fetcher: typeof fetch = async (path, options) => {
    assert.equal(path, '/api/fate/background');
    assert.equal(options?.method, 'PUT');
    assert.equal(options?.credentials, 'same-origin');
    assert.equal(options?.cache, 'no-store');
    assert.equal(options?.body, '{"enabled":false}');
    assert.ok(options?.signal);
    return Response.json({ username: 'alice', session: null });
  };
  assert.deepEqual(
    await requestFateJson('/api/fate/background', {
      method: 'PUT',
      body: { enabled: false },
      fetcher,
    }),
    { username: 'alice', session: null },
  );
  await assert.rejects(
    requestFateJson('/account', {
      fetcher: async () =>
        Response.json({ error: '账号已变更' }, { status: 409 }),
    }),
    /账号已变更/,
  );
  await assert.rejects(
    requestFateJson('/account', {
      fetcher: async () => Response.json(null),
    }),
    /无法读取/,
  );
});

void test('a stalled account or background request releases the caller and aborts its transport', async () => {
  let transport: AbortSignal | null | undefined;
  await assert.rejects(
    requestFateJson('/account', {
      timeoutMs: 10,
      fetcher: async (_, options) => {
        transport = options?.signal;
        return new Promise<Response>(() => {});
      },
    }),
    FateCloudTimeout,
  );
  assert.equal(transport?.aborted, true);
});

void test('the deadline also covers a server that sends headers but never completes its JSON body', async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"username":'));
    },
  });
  await assert.rejects(
    requestFateJson('/background', {
      timeoutMs: 10,
      fetcher: async () => new Response(stream),
    }),
    FateCloudTimeout,
  );
});

void test('switching accounts cancels an in-flight read without waiting for its timeout', async () => {
  const requests = createFateAccountRequests();
  const old = requests.begin('alice')!;
  const pending = requestFateJson('/background', {
    signal: old.signal,
    timeoutMs: 10_000,
    fetcher: async () => new Promise<Response>(() => {}),
  });
  const newer = requests.begin('bob')!;
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(old.signal.aborted, true);
  assert.equal(requests.isCurrent(old), false);
  assert.equal(
    requests.finish(old),
    false,
    'an old finally must not clear the new account request',
  );
  assert.equal(requests.isCurrent(newer), true);
  assert.equal(
    requests.begin('bob'),
    null,
    'polling cannot overlap the current operation',
  );
  assert.equal(requests.finish(newer), true);
  assert.ok(
    requests.begin('bob'),
    'a completed or failed request can be retried',
  );
  requests.cancel();
});

void test('an explicit background change cancels a pending read, and disposal rejects late replies', () => {
  const requests = createFateAccountRequests();
  const read = requests.begin('alice')!;
  const change = requests.begin('alice', true)!;
  assert.equal(read.signal.aborted, true);
  assert.equal(requests.finish(read), false);
  assert.equal(requests.isCurrent(change), true);
  requests.cancel();
  assert.equal(change.signal.aborted, true);
  assert.equal(requests.isCurrent(change), false);
  assert.equal(requests.finish(change), false);
});

void test('already-cancelled account operations never contact the server', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    requestFateJson('/background', {
      signal: controller.signal,
      fetcher: async () => {
        calls++;
        return Response.json({});
      },
    }),
    { name: 'AbortError' },
  );
  assert.equal(calls, 0);
});
