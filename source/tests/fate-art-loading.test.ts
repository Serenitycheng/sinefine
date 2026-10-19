import test from 'node:test';
import assert from 'node:assert/strict';
import { loadArtImage } from '../lib/fate-art-loader';
import { emiyaRoomRequiredArt } from '../lib/fate-emiya-actions';
import { ILLYA_ART_SPRITE } from '../lib/fate-character-art';
import { EMIYA_ROOMS } from '../lib/fate-emiya-house';

void test('sprite readiness waits for decoding, coalesces concurrent views and promotes foreground priority', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const instances: FakeImage[] = [];
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    fetchPriority = '';
    decoding = '';
    src = '';
    finish!: () => void;
    constructor() {
      instances.push(this);
    }
    decode() {
      return new Promise<void>((resolve) => {
        this.finish = resolve;
      });
    }
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { Image: FakeImage },
  });
  try {
    let finished = false;
    const first = loadArtImage('/loading-test/actor.png', 'low');
    const second = loadArtImage('/loading-test/actor.png', 'high');
    void first.then(() => {
      finished = true;
    });
    assert.equal(first, second);
    assert.equal(instances.length, 1);
    assert.equal(instances[0].fetchPriority, 'high');
    instances[0].onload!();
    await Promise.resolve();
    assert.equal(finished, false);
    instances[0].finish();
    await first;
    assert.equal(finished, true);
    const failed = loadArtImage('/loading-test/retry.png');
    instances[1].onerror!();
    await assert.rejects(failed);
    const retry = loadArtImage('/loading-test/retry.png');
    assert.equal(instances.length, 3);
    instances[2].onload!();
    instances[2].finish();
    await retry;
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

void test('native Emiya entry includes Illya walking art and only the current room painting', () => {
  const art = emiyaRoomRequiredArt('hall', false, false, []);
  assert.ok(art.includes(ILLYA_ART_SPRITE));
  assert.ok(art.includes(EMIYA_ROOMS.hall.scene.painting));
  assert.ok(!art.includes(EMIYA_ROOMS.rest.scene.painting));
  assert.ok(!art.includes(EMIYA_ROOMS.study.scene.painting));
});

void test('an image which never loads times out and remains manually retryable', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const instances: FakeImage[] = [];
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    fetchPriority = '';
    decoding = '';
    src = '';
    constructor() {
      instances.push(this);
    }
    decode() {
      return Promise.resolve();
    }
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { Image: FakeImage },
  });
  try {
    const pending = loadArtImage('/loading-test/timeout.png');
    context.mock.timers.tick(20001);
    await assert.rejects(pending, /timed out/);
    const retry = loadArtImage('/loading-test/timeout.png');
    assert.equal(instances.length, 2);
    instances[1].onload!();
    await retry;
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
    context.mock.timers.reset();
  }
});

void test('a room waits for all visible resident sheets without preloading absent residents', () => {
  const plain = emiyaRoomRequiredArt('hall', true, false, []);
  const occupied = emiyaRoomRequiredArt('hall', true, false, [
    'saber',
    'sakura',
    'taiga',
  ]);
  assert.ok(occupied.length > plain.length);
  assert.equal(new Set(occupied).size, occupied.length);
  assert.ok(occupied.some((file) => file.includes('saber-walk')));
  assert.ok(occupied.some((file) => file.includes('saber-life')));
  assert.ok(!plain.some((file) => file.includes('saber')));
});
