import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSharp } from './art-workflow.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharp = loadSharp();
const sources = ['/fate/art-sample/illya-walk-v1.png'];
async function collect(folder) {
  for (const entry of await fs.readdir(join(root, 'public/fate', folder), {
    withFileTypes: true,
  })) {
    if (entry.isDirectory()) await collect(`${folder}/${entry.name}`);
    else if (entry.isFile() && entry.name.endsWith('.png'))
      sources.push(`/fate/${folder}/${entry.name}`);
  }
}
for (const folder of ['city-art', 'interior-art', 'character-art'])
  await collect(folder);
const copies = {};
let originals = 0,
  served = 0,
  created = 0;
await fs.mkdir(join(root, 'public/fate/runtime'), { recursive: true });
for (const source of sources.sort()) {
  const input = await fs.readFile(join(root, 'public', source));
  originals += input.length;
  const hash = createHash('sha256')
    .update('lossless-webp-v1:')
    .update(input)
    .digest('hex')
    .slice(0, 24);
  const file = `/fate/runtime/${hash}.webp`,
    target = join(root, 'public', file);
  let bytes;
  try {
    bytes = (await fs.stat(target)).size;
  } catch {
    const output = await sharp(input)
      .keepIccProfile()
      .webp({ lossless: true, effort: 5 })
      .toBuffer();
    const before = await sharp(input).ensureAlpha().raw().toBuffer(),
      after = await sharp(output).ensureAlpha().raw().toBuffer();
    if (before.length !== after.length)
      throw new Error(`Image size changed: ${source}`);
    for (let i = 0; i < before.length; i += 4)
      if (
        before[i + 3] !== after[i + 3] ||
        (before[i + 3] > 0 &&
          (before[i] !== after[i] ||
            before[i + 1] !== after[i + 1] ||
            before[i + 2] !== after[i + 2]))
      )
        throw new Error(`Visible pixel changed: ${source}`);
    await fs.writeFile(target, output, { flag: 'wx' });
    bytes = output.length;
    created++;
  }
  copies[source] = bytes < input.length ? file : source;
  served += Math.min(bytes, input.length);
}
const manifest = join(root, 'lib/fate-runtime-art-data.json');
const text = JSON.stringify(copies, null, 2) + '\n';
if ((await fs.readFile(manifest, 'utf8').catch(() => '')) !== text)
  await fs.writeFile(manifest, text);
console.log(
  JSON.stringify({
    assets: sources.length,
    created,
    originalBytes: originals,
    runtimeBytes: served,
    savedPercent: Math.round((1 - served / originals) * 100),
    visiblePixelDifferences: 0,
  }),
);
