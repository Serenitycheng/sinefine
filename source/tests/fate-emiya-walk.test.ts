import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  emiyaWalkAdvance,
  shirouWalkSprite,
  SHIROU_SIDE_GAIT,
} from '../lib/fate-emiya-walk';
import { EMIYA_ROOMS, type EmiyaLocation } from '../lib/fate-emiya-house';

const location: EmiyaLocation = { room: 'table', point: { x: 430, y: 470 } };
void test('the actual gait has distinct contact and passing silhouettes, complete RGBA frames and an unchanged idle sheet', () => {
  const png = readFileSync(`public${SHIROU_SIDE_GAIT.path}`);
  assert.equal(png.readUInt32BE(16), SHIROU_SIDE_GAIT.width);
  assert.equal(png.readUInt32BE(20), SHIROU_SIDE_GAIT.height);
  assert.equal(png[25], 6);
  const frames = SHIROU_SIDE_GAIT.frames;
  assert.ok(frames[0].bounds.width > frames[2].bounds.width * 1.4);
  assert.ok(frames[3].bounds.width > frames[5].bounds.width * 1.4);
  for (const f of frames) {
    assert.ok(
      f.x > 0 &&
        f.y > 0 &&
        f.x + f.width < SHIROU_SIDE_GAIT.width &&
        f.y + f.height < SHIROU_SIDE_GAIT.height,
    );
    assert.ok(
      f.bounds.x > 0 &&
        f.bounds.y > 0 &&
        f.bounds.x + f.bounds.width < f.width &&
        f.bounds.y + f.bounds.height < f.height,
    );
  }
  for (const direction of ['left', 'right', 'up', 'down'] as const)
    assert.match(
      shirouWalkSprite(direction, 0).sheet.path,
      /shirou-walk-soft-v1/,
    );
});
void test('mirrored side walking preserves the body anchor and uses one fixed scale throughout both halves', () => {
  const scales = new Set<number>();
  for (let phase = 1; phase <= 6; phase++) {
    const left = shirouWalkSprite('left', phase),
      right = shirouWalkSprite('right', phase);
    assert.deepEqual(right.frame, left.frame);
    assert.equal(right.mirror, true);
    assert.equal(left.mirror, false);
    assert.equal(right.anchorX + left.anchorX, left.frame.width);
    scales.add(left.scale);
  }
  assert.equal(scales.size, 1);
  assert.equal(
    shirouWalkSprite('left', 1).frame,
    shirouWalkSprite('left', 7).frame,
  );
});
void test('steps depend only on real travel and match at different frame rates, depth and camera-independent scale', () => {
  const single = emiyaWalkAdvance(0, location, 400);
  for (const count of [30, 60, 144]) {
    let state = { walked: 0, frame: 0 };
    for (let i = 0; i < count; i++)
      state = emiyaWalkAdvance(state.walked, location, 400 / count);
    assert.ok(Math.abs(state.walked - single.walked) < 1e-7);
    assert.equal(state.frame, single.frame);
  }
  for (const y of [180, 570]) {
    const at: EmiyaLocation = { room: 'table', point: { x: 430, y } };
    const state = emiyaWalkAdvance(0, at, 400);
    assert.ok(Math.abs(state.walked - single.walked) < 1e-7);
    assert.equal(state.frame, single.frame);
  }
  const before = JSON.stringify(EMIYA_ROOMS);
  emiyaWalkAdvance(100, location, 10);
  assert.equal(JSON.stringify(EMIYA_ROOMS), before);
});
void test('all six gait phases are reached and blocked, paused or stopped movement immediately returns to rest', () => {
  let state = { walked: 0, frame: 0 };
  const phases = new Set<number>();
  for (let i = 0; i < 200; i++) {
    state = emiyaWalkAdvance(state.walked, location, 2);
    phases.add(state.frame);
  }
  assert.deepEqual([...phases].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  for (const travel of [0, 0.0001, -1, NaN])
    assert.deepEqual(emiyaWalkAdvance(state.walked, location, travel), {
      walked: 0,
      frame: 0,
    });
  assert.equal(emiyaWalkAdvance(0, location, 1).frame, 1);
});
