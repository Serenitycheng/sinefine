import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BACKGROUND_SYNC_KEY,
  backgroundSyncHold,
  readBackgroundMarker,
  type BackgroundSyncMarker,
} from '../lib/fate-background-sync';
import type { BackgroundView } from '../lib/fate-background';
import { FateCloudTimeout, requestFateJson } from '../lib/fate-cloud-client';

const active: BackgroundSyncMarker = {
  username: 'alice',
  fingerprint: 'a'.repeat(64),
  active: true,
};
const stored = (marker: unknown) => ({
  getItem(key: string) {
    assert.equal(key, BACKGROUND_SYNC_KEY);
    return JSON.stringify(marker);
  },
});

void test('an active handoff survives a failed status read and a refreshed or logged-out page', async () => {
  const storage = stored(active);
  let view: BackgroundView | null = null;
  await assert.rejects(async () => {
    view = await requestFateJson<BackgroundView>('/api/fate/background', {
      timeoutMs: 5,
      fetcher: async () => new Promise<Response>(() => {}),
    });
  }, FateCloudTimeout);
  const hold = backgroundSyncHold(readBackgroundMarker(storage), view);
  assert.equal(
    hold.locked,
    true,
    'a timeout must not restart the local engine',
  );
  assert.equal(hold.pending, true);
  assert.equal(hold.username, 'alice');
  assert.equal(
    backgroundSyncHold(readBackgroundMarker(storage), {
      username: 'bob',
      session: null,
    }).locked,
    true,
    'an empty session from another account cannot unlock the old story',
  );
});

void test('the handoff is unlocked after confirmed reconciliation, not by a cached stopped view', () => {
  const stopped: BackgroundView = { username: 'alice', session: null };
  assert.equal(backgroundSyncHold(active, stopped).locked, true);
  assert.equal(backgroundSyncHold(active, stopped).pending, true);
  const confirmed = { ...active, active: false };
  assert.deepEqual(backgroundSyncHold(confirmed, stopped), {
    locked: false,
    pending: false,
    username: null,
  });
  assert.equal(
    backgroundSyncHold(null, null).locked,
    false,
    'new local players remain playable',
  );
  assert.equal(
    backgroundSyncHold(confirmed, null).locked,
    false,
    'a previously stopped session does not block local play',
  );
});

void test('background markers reject malformed data and inaccessible browser storage without crashing', () => {
  assert.deepEqual(readBackgroundMarker(stored(active)), active);
  for (const marker of [
    null,
    [],
    {},
    { ...active, username: '' },
    { ...active, active: 'true' },
    { ...active, fingerprint: 7 },
  ])
    assert.equal(readBackgroundMarker(stored(marker)), null);
  assert.equal(
    readBackgroundMarker({
      getItem() {
        throw new Error('blocked');
      },
    }),
    null,
  );
});
