import assert from 'node:assert/strict';
import test from 'node:test';
import { gameViewportSize } from '../lib/fate-game-viewport';

void test('wide and short windows show the whole painting without side bars or stretching', () => {
  for (const [width, height] of [
    [2880, 1440],
    [1920, 970],
    [1280, 610],
    [2560, 960],
    [844, 280],
  ]) {
    const canvas = gameViewportSize(width, height);
    const fit = Math.min(canvas.width / 1600, canvas.height / 900);
    assert.ok(canvas.width <= width && canvas.height <= height);
    assert.ok(Math.abs(canvas.width - 1600 * fit) < 0.01);
    assert.ok(Math.abs(canvas.height - 900 * fit) < 0.01);
    assert.ok(
      Math.abs(canvas.width - width) < 0.01 ||
        Math.abs(canvas.height - height) < 0.01,
    );
  }
});

void test('portrait touch play keeps the available height and hidden frames do not become negative', () => {
  assert.deepEqual(gameViewportSize(390, 730), { width: 390, height: 730 });
  assert.deepEqual(gameViewportSize(0, 900), { width: 0, height: 0 });
});
