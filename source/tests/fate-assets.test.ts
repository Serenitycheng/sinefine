import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

void test('all street walk strips have smaller transparent WebP game assets with unchanged dimensions', () => {
  const directory = join(process.cwd(), 'public', 'fate', 'street');
  const sources = readdirSync(directory).filter((name) => name.endsWith('-walk.png'));
  assert.equal(sources.length, 16);
  for (const name of sources) {
    const original = png(`/fate/street/${name}`);
    const sourcePath = join(directory, name);
    const gamePath = join(directory, name.replace(/\.png$/, '.webp'));
    const encoded = readFileSync(gamePath);
    assert.equal(encoded.toString('ascii', 0, 4), 'RIFF', name);
    assert.equal(encoded.toString('ascii', 8, 16), 'WEBPVP8X', name);
    assert.ok(encoded[20] & 0x10, `${name} lost its alpha channel`);
    const width = encoded.readUIntLE(24, 3) + 1;
    const height = encoded.readUIntLE(27, 3) + 1;
    assert.equal(width, original.width, name);
    assert.equal(height, original.height, name);
    assert.ok(statSync(gamePath).size < statSync(sourcePath).size, name);
  }
});
