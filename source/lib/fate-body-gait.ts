import type { BodyFacing } from './fate-body-facing';
import type { PreviewSprite } from './fate-preview-house';

type Point = { x: number; y: number };
const identity = [1, 0, 0, 1, 0, 0];
/** A continuous lower-body mesh keeps the original painted hands/hair intact.
 * Both feet use opposite phases. Shared vertices avoid cut-and-rotate limb seams. */
export function bodyGait(
  sprite: PreviewSprite,
  facing: BodyFacing,
  phase: number,
): PreviewSprite {
  if (phase <= 0) return sprite;
  const b = sprite.bounds,
    h = b.height,
    w = b.width;
  const p = (((phase - 1) % 6) / 6) * Math.PI * 2;
  const dx = facing.includes('left') ? -1 : facing.includes('right') ? 1 : 0;
  const dy = facing.startsWith('up')
    ? -0.35
    : facing.startsWith('down')
      ? 0.35
      : 0;
  const top = b.y + h * 0.56,
    knee = b.y + h * 0.77,
    ankle = b.y + h * 0.94,
    sole = b.y + h;
  const xs = [
    b.x - 2,
    b.x + w * 0.25,
    b.x + w * 0.5,
    b.x + w * 0.75,
    b.x + w + 2,
  ];
  const ys = [top, knee, ankle, sole + 2];
  const bob = -Math.abs(Math.sin(p)) * h * 0.0025;
  const move = (q: Point): Point => {
    const t = Math.max(0, Math.min(1, (q.y - top) / (sole - top)));
    const x = (q.x - b.x) / w;
    // Front/back projected feet separate laterally; profiles use a gentle stride.
    const foot = Math.sin(p + (x < 0.5 ? 0 : Math.PI));
    const separation = Math.cos(Math.PI * x * 2) * 0.12;
    return {
      x: q.x + foot * h * 0.022 * t * (dx || separation),
      y:
        q.y +
        bob +
        foot * h * 0.012 * t * dy -
        Math.max(0, Math.cos(p + (x < 0.5 ? 0 : Math.PI))) * h * 0.009 * t,
    };
  };
  const layers: NonNullable<PreviewSprite['rig']>['layers'] = [
    {
      part: 'body',
      clip: [
        [0, 0],
        [sprite.cellWidth, 0],
        [sprite.cellWidth, top + 0.5],
        [0, top + 0.5],
      ],
      matrix: [1, 0, 0, 1, 0, bob],
    },
  ];
  const affine = (
    a: Point,
    c: Point,
    d: Point,
    A: Point,
    C: Point,
    D: Point,
  ) => {
    const ux = c.x - a.x,
      uy = c.y - a.y,
      vx = d.x - a.x,
      vy = d.y - a.y,
      det = ux * vy - uy * vx;
    if (Math.abs(det) < 1e-8) return identity;
    const Ux = C.x - A.x,
      Uy = C.y - A.y,
      Vx = D.x - A.x,
      Vy = D.y - A.y;
    const m = [
      (Ux * vy - Vx * uy) / det,
      (Uy * vy - Vy * uy) / det,
      (-Ux * vx + Vx * ux) / det,
      (-Uy * vx + Vy * ux) / det,
      0,
      0,
    ];
    m[4] = A.x - m[0] * a.x - m[2] * a.y;
    m[5] = A.y - m[1] * a.x - m[3] * a.y;
    return m;
  };
  for (let y = 0; y < ys.length - 1; y++)
    for (let x = 0; x < xs.length - 1; x++) {
      const a = { x: xs[x], y: ys[y] },
        c = { x: xs[x + 1], y: ys[y] },
        d = { x: xs[x], y: ys[y + 1] },
        e = { x: xs[x + 1], y: ys[y + 1] };
      for (const [i, tri] of [
        [0, [a, c, d]],
        [1, [c, e, d]],
      ] as const) {
        const matrix = affine(
          tri[0],
          tri[1],
          tri[2],
          move(tri[0]),
          move(tri[1]),
          move(tri[2]),
        );
        layers.push({
          part: `leg-mesh-${x}-${y}-${i}`,
          clip: tri.map((q) => [q.x, q.y]),
          matrix,
        });
      }
    }
  // The lower sole stays at its saved world anchor; lift only the other foot.
  const lower = Math.max(
    move({ x: xs[1], y: sole }).y,
    move({ x: xs[3], y: sole }).y,
  );
  const ground = sole - lower;
  for (const l of layers)
    l.matrix = [...l.matrix.slice(0, 5), l.matrix[5] + ground];
  return {
    ...sprite,
    bounds: {
      x: b.x - h * 0.03,
      y: b.y - h * 0.01,
      width: w + h * 0.06,
      height: h * 1.01,
    },
    rig: {
      kind: 'body-v2',
      phase,
      layers,
      legs: [0, 1].map((i) => ({
        hip: { x: b.x + w * (i ? 0.65 : 0.35), y: top },
        knee: { x: b.x + w * (i ? 0.65 : 0.35), y: knee },
        ankle: move({ x: b.x + w * (i ? 0.65 : 0.35), y: ankle }),
        bend: Math.sin(p + i * Math.PI),
      })),
    },
  };
}
