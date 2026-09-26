import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { FATE_CAST } from '../lib/fate-cast';
import { RECOVERY_IDS } from '../lib/fate-recovery-presets';

function png(asset: string) {
  const file = readFileSync(join(process.cwd(), 'public', asset));
  assert.equal(file.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset);
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
    color: file[25],
  };
}

void test('every declared character portrait and fallback image exists as a readable PNG', () => {
  for (const person of FATE_CAST) {
    const assets = person.portraits.map(portrait => portrait.file);
    if (person.chibi) assets.push(person.chibi);
    assert.ok(assets.length > 0, person.id);
    for (const asset of assets) {
      const image = png(asset);
      assert.ok(image.width > 0 && image.height > 0, asset);
    }
  }
});

void test('each added resident has a four-frame RGBA strip matching its displayed cell proportions', () => {
  for (const id of RECOVERY_IDS) {
    const image = png(`/fate/street/${id}-walk.png`);
    assert.equal(image.color, 6, `${id} needs an alpha channel`);
    assert.equal(image.width % 4, 0, `${id} needs four whole cells`);
    assert.equal(image.width / (4 * image.height), 0.75, id);
  }
});
