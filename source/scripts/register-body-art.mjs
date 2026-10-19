/** Regenerate calibrated crops from the preserved body-v2 PNGs. No raster pixels are changed. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSharp } from './art-workflow.mjs';
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const registrations = JSON.parse(
  readFileSync('lib/fate-body-art-registration.json'),
);
const sharp = await loadSharp();
const simplify = (points, tolerance = 1.5) => {
  if (points.length < 3) return points;
  const a = points[0],
    b = points.at(-1),
    dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = dx * dx + dy * dy;
  let best = 0,
    at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      t = l
        ? Math.max(
            0,
            Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l),
          )
        : 0;
    const d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    if (d > best) {
      best = d;
      at = i;
    }
  }
  return best > tolerance
    ? [
        ...simplify(points.slice(0, at + 1)).slice(0, -1),
        ...simplify(points.slice(at)),
      ]
    : [a, b];
};
const atlas = [];
for (const job of registrations) {
  job.source = `public/fate/character-art/body-v2/${job.id}.png`;
  const { data, info } = await sharp(job.source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width,
    h = info.height,
    frames = [];
  const bad = [];
  // Connected paint, not uniform row heights: generated atlases have shorter seated rows.
  for (let col = 0; col < 4; col++) {
    const x0 = Math.floor((col * w) / 4),
      x1 = Math.floor(((col + 1) * w) / 4),
      cw = x1 - x0;
    const seen = new Uint8Array(cw * h),
      components = [];
    for (let y = 0; y < h; y++)
      for (let x = x0; x < x1; x++) {
        const loc = y * cw + x - x0;
        if (seen[loc] || data[(y * w + x) * 4 + 3] < 80) continue;
        let count = 0,
          minX = x,
          maxX = x,
          minY = y,
          maxY = y;
        const queue = [loc];
        seen[loc] = 1;
        for (let q = 0; q < queue.length; q++) {
          const n = queue[q],
            py = Math.floor(n / cw),
            px = (n % cw) + x0;
          count++;
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
          for (const [nx, ny] of [
            [px - 1, py],
            [px + 1, py],
            [px, py - 1],
            [px, py + 1],
          ]) {
            if (nx < x0 || nx >= x1 || ny < 0 || ny >= h) continue;
            const a = ny * cw + nx - x0;
            if (seen[a] || data[(ny * w + nx) * 4 + 3] < 80) continue;
            seen[a] = 1;
            queue.push(a);
          }
        }
        if (count > 700) {
          const edge = new Map();
          for (const n of queue) {
            const py = Math.floor(n / cw),
              px = (n % cw) + x0;
            const e = edge.get(py) ?? [px, px];
            e[0] = Math.min(e[0], px);
            e[1] = Math.max(e[1], px);
            edge.set(py, e);
          }
          const left = [],
            right = [];
          for (let py = minY; py <= maxY; py++) {
            const e = edge.get(py);
            if (!e) continue;
            left.push([e[0] - 3, py]);
            right.push([e[1] + 3, py]);
          }
          const polygon = [...simplify(left), ...simplify(right).reverse()];
          const soles = queue
            .filter((n) => Math.floor(n / cw) >= maxY - 3)
            .map((n) => (n % cw) + x0);
          const footX = (Math.min(...soles) + Math.max(...soles)) / 2;
          components.push({
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            count,
            polygon,
            footX,
          });
        }
      }
    // Detached paint from a neighbour is never a second pose. Keep the authored bodies.
    if (components.length > job.rows)
      components.sort((a, b) => b.count - a.count).splice(job.rows);
    components.sort((a, b) => a.y - b.y);
    if (components.length !== job.rows)
      bad.push({ col, count: components.length, components });
    for (let row = 0; row < components.length; row++) {
      const b = components[row];
      frames[row * 4 + col] = { ...b, col, row };
    }
  }
  const entry = { ...job, width: w, imageHeight: h, frames, bad };
  atlas.push(entry);
}

const jobs = atlas;
const facing = [
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
];
const hips = {
  rin: [0.68, 0.62],
  saber: [0.71, 0.61],
  shirou: [0.73, 0.62],
  sakura: [0.68, 0.62],
  diarmuid: [0.72, 0.62],
  irisviel: [0.67, 0.62],
  kiritsugu: [0.75, 0.62],
  natalia: [0.73, 0.62],
  taiga: [0.72, 0.61],
  illya: [0.67, 0.62],
  cu: [0.69, 0.62],
  waver: [0.66, 0.61],
  iskandar: [0.7, 0.63],
  medea: [0.62, 0.6],
  medusa: [0.57, 0.61],
};
const out = {};

for (const j of [
  ...jobs.filter((j) => !j.extension),
  ...jobs.filter((j) => j.extension),
]) {
  if (j.bad.length) throw new Error(`Invalid atlas registration: ${j.id}`);
  const path = `/fate/character-art/body-v2/${j.id}.png`;

  const frames = j.frames.map((b) => {
    const margin = 2,
      x = Math.max(0, b.x - margin),
      y = Math.max(0, b.y - margin),
      w = Math.min(j.width - x, b.width + margin * 2),
      h = Math.min(j.imageHeight - y, b.height + margin * 2);
    return {
      cropX: x,
      cropY: y,
      cellWidth: w,
      cellHeight: h,
      anchorX: b.footX - x,
      anchorY: b.y - y + b.height,
      bounds: { x: b.x - x, y: b.y - y, width: b.width, height: b.height },
      clip: b.polygon.map(([px, py]) => [px - x, py - y]),
    };
  });
  const extensionModel = j.extension
    ? out[j.id === 'rin-work' ? 'rin' : 'waver-young']
    : null;
  if (extensionModel) {
    for (const s of frames)
      Object.assign(s, {
        file: path,
        imageWidth: j.width,
        imageHeight: j.imageHeight,
      });
    const base = extensionModel.frames.length;
    if (j.id === 'rin-work') {
      extensionModel.layout.work = base;
      extensionModel.layout.standingRead = base + 2;
    } else {
      extensionModel.layout.chair = base;
      frames.forEach((s, i) => {
        const b = s.bounds;
        s.seat = {
          x: b.x + b.width * (i % 2 ? 0.27 : 0.73),
          y: b.y + b.height * 0.64,
        };
        s.seatedFacing = i % 2 ? 'right' : 'left';
      });
    }
    extensionModel.frames.push(...frames);
    continue;
  }
  const keys = Object.fromEntries(facing.map((f, i) => [f, i]));
  const layout = j.layout ?? {
    chair: 8,
    work: j.rows >= 4 ? 12 : null,
    standingRead: j.rows >= 4 ? 14 : null,
    floor: j.rows === 5 ? 16 : null,
  };
  const hip = hips[j.id] ?? [0.72, 0.62];
  for (const index of [
    layout.chair,
    layout.chair === null ? null : layout.chair + 1,
    layout.chair === null ? null : layout.chair + 2,
    layout.chair === null ? null : layout.chair + 3,
  ]) {
    if (index === null || index === undefined) continue;
    const s = frames[index],
      b = s.bounds,
      right = index % 2 === 1;
    s.seat = {
      x: b.x + b.width * (right ? 1 - hip[0] : hip[0]),
      y: b.y + b.height * hip[1],
    };
    s.seatedFacing = right ? 'right' : 'left';
  }
  out[j.id] = {
    file: path,
    imageWidth: j.width,
    imageHeight: j.imageHeight,
    height: j.height,
    keys,
    layout,
    frames,
  };
}
writeFileSync('lib/fate-body-art-data.json', JSON.stringify(out) + '\n');
console.log({
  models: Object.keys(out),
  frames: Object.values(out).reduce((n, j) => n + j.frames.length, 0),
});
