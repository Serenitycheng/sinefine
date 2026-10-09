import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localRequire = createRequire(import.meta.url);
const assetTypes = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.glb', '.gltf', '.obj', '.mtl', '.fbx', '.bin', '.ktx2', '.hdr', '.exr']);
const digest = (value) => createHash('sha256').update(value).digest('hex');

// Use an installed local module only. Never run a package manager or fetch a URL.
export function loadSharp() {
  const candidates = [() => localRequire('sharp')];
  if (process.env.SINEFINE_SHARP_PATH) {
    candidates.push(() => localRequire(resolve(process.env.SINEFINE_SHARP_PATH)));
  }
  candidates.push(() => createRequire(localRequire.resolve('next/package.json'))('sharp'));
  candidates.push(() => createRequire(process.execPath)('sharp'));
  for (const candidate of candidates) {
    try { return candidate(); } catch { /* Try the next already-installed location. */ }
  }
  throw new Error('找不到本地 sharp。请使用 Codex 已捆绑的 Node，或用 SINEFINE_SHARP_PATH 指向已安装模块；本工具不会下载依赖。');
}

export async function inventoryAssets(root = appRoot, match = '') {
  const assetRoot = join(root, 'public', 'fate');
  const files = [];
  let skippedLinks = 0;
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) { skippedLinks += 1; continue; }
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!entry.isFile() || !assetTypes.has(extname(entry.name).toLowerCase())) continue;
      const content = await fs.readFile(file);
      const png = content.length >= 24 && content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      files.push({ path: relative(root, file).split('\\').join('/'), bytes: content.length, sha256: digest(content), width: png ? content.readUInt32BE(16) : null, height: png ? content.readUInt32BE(20) : null });
    }
  }
  await visit(assetRoot);
  const directory = join(root, '.verification');
  await fs.mkdir(directory, { recursive: true });
  const manifest = join(directory, 'art-assets.json');
  await fs.writeFile(manifest, JSON.stringify({ schema: 1, files, skippedLinks }, null, 2) + '\n');
  const matches = match ? files.filter((file) => file.path.toLowerCase().includes(match.toLowerCase())) : [];
  return { count: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), skippedLinks, manifest, ...(match ? { match, matches: matches.length, shown: matches.slice(0, 10) } : {}) };
}

export async function createReview(input, { root = appRoot, detail = false, crop, sharp = loadSharp() } = {}) {
  if (typeof input !== 'string' || !input || /^(?:[a-z][a-z\d+.-]*:\/{2}|[\\/]{2})/i.test(input)) throw new Error('只接受本地文件路径，不读取远程 URL 或网络共享。');
  const source = await fs.realpath(resolve(input));
  const content = await fs.readFile(source);
  const metadata = await sharp(content).metadata();
  if (!metadata.width || !metadata.height) throw new Error('无法读取图片尺寸。');
  if (crop && (crop.length !== 4 || crop.some((value) => !Number.isSafeInteger(value)) || crop[0] < 0 || crop[1] < 0 || crop[2] <= 0 || crop[3] <= 0 || crop[0] + crop[2] > metadata.width || crop[1] + crop[3] > metadata.height)) {
    throw new Error('裁剪必须是原图内的 x,y,width,height 正整数范围（x、y 可为 0）。');
  }
  const recipe = { schema: 1, sourceHash: digest(content), crop: crop ?? null, maxEdge: detail ? 2560 : 1280, quality: detail ? 92 : 80, sharpVersion: sharp.versions.sharp };
  const directory = join(root, '.verification', 'art-review');
  await fs.mkdir(directory, { recursive: true });
  const preview = join(directory, digest(JSON.stringify(recipe)).slice(0, 32) + '.jpg');
  let reused = true;
  try { await fs.access(preview); } catch {
    reused = false;
    let image = sharp(content);
    if (crop) image = image.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
    const output = await image.resize({ width: recipe.maxEdge, height: recipe.maxEdge, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#25302c' }).jpeg({ quality: recipe.quality, mozjpeg: true }).toBuffer();
    try { await fs.writeFile(preview, output, { flag: 'wx' }); } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      reused = true;
    }
  }
  const saved = await sharp(preview).metadata();
  return { source, preview, sourceHash: recipe.sourceHash, sourceBytes: content.length, reviewBytes: (await fs.stat(preview)).size, width: saved.width, height: saved.height, reused };
}

export async function main(args = process.argv.slice(2)) {
  const [command, ...options] = args;
  if (command === 'inventory') {
    if (options.length && (options.length !== 2 || options[0] !== '--match')) throw new Error('用法：inventory [--match 路径关键词]');
    console.log(JSON.stringify(await inventoryAssets(appRoot, options[1] ?? ''), null, 2));
    return;
  }
  if (command === 'review') {
    const [input, ...flags] = options;
    if (!input || input.startsWith('--') || /^https?:\/\//i.test(input)) throw new Error('用法：review 本地图片 [--crop x,y,width,height] [--detail]');
    let detail = false;
    let crop;
    for (let index = 0; index < flags.length; index += 1) {
      if (flags[index] === '--detail') { detail = true; continue; }
      if (flags[index] === '--crop' && flags[index + 1]) {
        const value = flags[++index];
        if (!/^\d+,\d+,\d+,\d+$/.test(value)) throw new Error('裁剪格式：x,y,width,height');
        crop = value.split(',').map(Number);
        continue;
      }
      throw new Error('不支持的参数：' + flags[index]);
    }
    console.log(JSON.stringify(await createReview(input, { detail, crop }), null, 2));
    return;
  }
  throw new Error('用法：art-workflow.mjs inventory [--match 关键词] | review 本地图片 [--crop x,y,width,height] [--detail]');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
