import assert from 'node:assert/strict';
import test from 'node:test';
import { interiorDetailCrop } from '../lib/fate-interior-detail';

void test('object closeups use the painted target and keep the entire crop inside the original', () => {
  for (const target of [
    { x: 17 * 16, y: 61 * 9 },
    { x: 1599, y: 899 },
    { x: 0, y: 0 },
  ]) {
    const crop = interiorDetailCrop(target);
    assert.ok(crop.x >= 0 && crop.y >= 0);
    assert.ok(crop.x + crop.width <= 1600 && crop.y + crop.height <= 900);
    assert.ok(target.x >= crop.x && target.x <= crop.x + crop.width);
    assert.ok(target.y >= crop.y && target.y <= crop.y + crop.height);
  }
});
