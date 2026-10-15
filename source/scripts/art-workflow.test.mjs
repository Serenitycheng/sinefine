import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createReview, inventoryAssets, loadSharp } from './art-workflow.mjs';

const parent = resolve(dirname(fileURLToPath(import.meta.url)), '../.verification');
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function fixture(t) {
  await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(join(parent, 'workflow-test-'));
  t.after(async () => {
    const checked = await fs.realpath(root);
    const checkedParent = await fs.realpath(parent);
    // Remove only this exact, newly created fixture inside the verification directory.
    if (dirname(checked) !== checkedParent || !checked.startsWith(join(checkedParent, 'workflow-test-'))) throw new Error('Unexpected test cleanup path');
    await fs.rm(checked, { recursive: true, force: true });
  });
  return root;
}

test('deployment filtering keeps the runtime build and its helper executable', async (t) => {
  const root = await fixture(t);
  const source = resolve(parent, '..');
  const ignore = await fs.readFile(join(source, '.vercelignore'), 'utf8');
  await fs.writeFile(join(root, '.gitignore'), ignore);
  execFileSync('git', ['init', '--quiet', root]);
  const candidates = [
    'scripts/build-runtime-art.mjs',
    'scripts/art-workflow.mjs',
    'scripts/run-tests.mjs',
    '.env.local',
    '.verification/db-migration/credentials.env',
    'tests/fate-art-loading.test.ts',
  ];
  const ignored = new Set(execFileSync('git', ['-C', root, 'check-ignore', '--no-index', '--stdin'], {
    input: candidates.join('\n') + '\n', encoding: 'utf8',
  }).trim().split(/\r?\n/));
  assert.deepEqual(candidates.filter(file => !ignored.has(file)), candidates.slice(0, 2));
  await fs.mkdir(join(root, 'scripts'), { recursive: true });
  for (const file of candidates.slice(0, 2)) {
    if (!ignored.has(file)) await fs.copyFile(join(source, file), join(root, file));
  }
  await fs.copyFile(join(source, 'package.json'), join(root, 'package.json'));
  for (const dir of ['lib', 'public/fate/art-sample', 'public/fate/city-art', 'public/fate/interior-art', 'public/fate/character-art'])
    await fs.mkdir(join(root, dir), { recursive: true });
  const original = await loadSharp()({ create: { width: 16, height: 16, channels: 4, background: '#8f9b87' } }).png().toBuffer();
  const input = join(root, 'public/fate/art-sample/illya-walk-v1.png');
  await fs.writeFile(input, original);
  const result = JSON.parse(execFileSync(process.execPath, ['scripts/build-runtime-art.mjs'], { cwd: root, encoding: 'utf8' }));
  assert.equal(result.assets, 1);
  assert.equal(result.created, 1);
  assert.equal(result.visiblePixelDifferences, 0);
  const manifest = JSON.parse(await fs.readFile(join(root, 'lib/fate-runtime-art-data.json'), 'utf8'));
  await fs.access(join(root, 'public', manifest['/fate/art-sample/illya-walk-v1.png']));
  assert.equal(hash(await fs.readFile(input)), hash(original));
});

test('review preserves the original, bounds dimensions and reuses identical content', async (t) => {
  const root = await fixture(t);
  const sharp = loadSharp();
  const input = join(root, 'original.png');
  const original = await sharp({ create: { width: 1800, height: 1000, channels: 4, background: '#7fa986' } }).png().toBuffer();
  await fs.writeFile(input, original);
  const first = await createReview(input, { root, sharp });
  assert.equal(first.width, 1280);
  assert.ok(first.height <= 1280);
  assert.equal(first.reused, false);
  assert.equal(hash(await fs.readFile(input)), hash(original));
  const stat = await fs.stat(first.preview);
  const second = await createReview(input, { root, sharp });
  assert.equal(second.preview, first.preview);
  assert.equal(second.reused, true);
  assert.equal((await fs.stat(first.preview)).mtimeMs, stat.mtimeMs);
  const renamed = join(root, 'same-content.png');
  await fs.copyFile(input, renamed);
  assert.equal((await createReview(renamed, { root, sharp })).preview, first.preview);
  const changed = await sharp(original).tint('#4f6d88').png().toBuffer();
  await fs.writeFile(input, changed);
  const updated = await createReview(input, { root, sharp });
  assert.notEqual(updated.preview, first.preview);
  assert.equal(updated.reused, false);
  assert.equal(hash(await fs.readFile(input)), hash(changed));
});

test('detail does not enlarge sources; crops cannot escape the image', async (t) => {
  const root = await fixture(t);
  const sharp = loadSharp();
  const input = join(root, 'small.png');
  await sharp({ create: { width: 640, height: 480, channels: 3, background: '#ddd8bf' } }).png().toFile(input);
  const detail = await createReview(input, { root, sharp, detail: true });
  assert.deepEqual([detail.width, detail.height], [640, 480]);
  const crop = await createReview(input, { root, sharp, crop: [10, 20, 100, 80] });
  assert.deepEqual([crop.width, crop.height], [100, 80]);
  assert.notEqual(crop.preview, detail.preview);
  await assert.rejects(createReview(input, { root, sharp, crop: [600, 0, 100, 80] }), /裁剪/);
  await assert.rejects(createReview(input, { root, sharp, crop: [0, 0, 0, 80] }), /裁剪/);
});

test('inventory only includes local assets, stores hashes and limits printed matches', async (t) => {
  const root = await fixture(t);
  const folder = join(root, 'public', 'fate');
  await fs.mkdir(folder, { recursive: true });
  const sharp = loadSharp();
  const original = await sharp({ create: { width: 24, height: 16, channels: 3, background: '#a7b89b' } }).png().toBuffer();
  for (let i = 0; i < 12; i += 1) await fs.writeFile(join(folder, 'plant-' + i + '.png'), original);
  await fs.writeFile(join(folder, 'notes.txt'), 'not an asset');
  await fs.writeFile(join(root, 'outside.png'), original);
  const outside = join(root, 'external-assets');
  await fs.mkdir(outside);
  await fs.writeFile(join(outside, 'not-followed.png'), original);
  await fs.symlink(outside, join(folder, 'external'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = await inventoryAssets(root, 'plant');
  assert.equal(result.count, 12);
  assert.equal(result.matches, 12);
  assert.equal(result.shown.length, 10);
  assert.equal(result.skippedLinks, 1);
  const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  assert.equal(manifest.files[0].sha256, hash(original));
  assert.deepEqual([manifest.files[0].width, manifest.files[0].height], [24, 16]);
  assert.ok(manifest.files.every((file) => file.path.startsWith('public/fate/')));
  assert.equal(hash(await fs.readFile(join(folder, 'plant-0.png'))), hash(original));
});

test('review rejects remote URLs and network shares', async () => {
  await assert.rejects(createReview('https://example.com/image.png'), /本地文件/);
  await assert.rejects(createReview('\\\\server\\share\\image.png'), /本地文件/);
});
