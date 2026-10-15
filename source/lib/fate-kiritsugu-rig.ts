import data from './fate-einzbern-sprite-data.json';
import {
  mirrorPreviewSprite,
  type PreviewDirection,
  type PreviewSprite,
} from './fate-preview-house';

type Point = { x: number; y: number };
const rotate = (p: Point, angle: number) => ({
  x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
  y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
});
const add = (a: Point, b: Point) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
const sideLeg = {
  hip: { x: 66, y: 242 },
  knee: { x: 71, y: 356 },
  ankle: { x: 81, y: 451 },
  thigh: [
    [44, 238],
    [82, 238],
    [86, 362],
    [55, 366],
  ],
  shin: [
    [55, 350],
    [86, 350],
    [96, 455],
    [62, 460],
  ],
  foot: [
    [62, 441],
    [96, 441],
    [100, 482],
    [23, 482],
    [23, 465],
    [60, 453],
  ],
};

/** Actual articulated legs, rather than a repeated three-pose half-cycle.
 * Original painted pixels remain in the atlas; local joint matrices animate them. */
export function kiritsuguRig(
  direction: PreviewDirection,
  phase: number,
): PreviewSprite {
  const side = direction === 'left' || direction === 'right';
  const index = side ? 2 : direction === 'up' ? 1 : 0;
  const sheet = data.kiritsugu,
    frame = sheet.frames[index]!;
  const p = (((Math.max(1, phase) - 1) % 6) / 6) * Math.PI * 2;
  const base: PreviewSprite = {
    ...frame,
    file: sheet.file,
    imageWidth: sheet.imageWidth,
    imageHeight: sheet.imageHeight,
    scale: sheet.scales.idle,
    mirror: false,
    index: (side ? 0 : direction === 'down' ? 6 : 12) + ((phase - 1) % 6),
  };
  const legs: NonNullable<PreviewSprite['rig']>['legs'] = [];
  const layers: NonNullable<PreviewSprite['rig']>['layers'] = [];
  for (let leg = 0; leg < 2; leg++) {
    const t = p + leg * Math.PI;
    const hipAngle = ((side ? 12 : 2.5) * Math.cos(t) * Math.PI) / 180;
    const bend =
      ((side ? -30 : leg ? 7 : -7) * Math.max(0, -Math.sin(t)) * Math.PI) / 180;
    const template = side
      ? sideLeg
      : {
          hip: { x: leg ? 93 : 50, y: 247 },
          knee: { x: leg ? 94 : 50, y: 354 },
          ankle: { x: leg ? 96 : 46, y: 450 },
          thigh: leg
            ? [
                [73, 238],
                [116, 238],
                [113, 365],
                [72, 365],
              ]
            : [
                [29, 238],
                [73, 238],
                [73, 365],
                [29, 365],
              ],
          shin: leg
            ? [
                [73, 350],
                [113, 350],
                [118, 457],
                [72, 457],
              ]
            : [
                [29, 350],
                [73, 350],
                [73, 457],
                [23, 457],
              ],
          foot: leg
            ? [
                [72, 441],
                [118, 441],
                [125, 482],
                [72, 482],
              ]
            : [
                [23, 441],
                [73, 441],
                [73, 482],
                [10, 482],
              ],
        };
    const hip = {
      x: template.hip.x + (side ? (leg ? 0 : -9) : 0),
      y: template.hip.y - (side ? 0 : 10 * Math.max(0, -Math.sin(t))),
    };
    const knee = add(hip, rotate(sub(template.knee, template.hip), hipAngle));
    const ankle = add(
      knee,
      rotate(sub(template.ankle, template.knee), hipAngle + bend),
    );
    legs.push({ hip, knee, ankle, bend });
    const matrix = (origin: Point, target: Point, angle: number) => {
      const r = rotate(origin, angle);
      return [
        Math.cos(angle),
        Math.sin(angle),
        -Math.sin(angle),
        Math.cos(angle),
        target.x - r.x,
        target.y - r.y,
      ];
    };
    const name = leg ? 'near' : 'far';
    for (const [part, clip, origin, target, angle] of [
      ['thigh', template.thigh, template.hip, hip, hipAngle],
      ['shin', template.shin, template.knee, knee, hipAngle + bend],
      ['foot', template.foot, template.ankle, ankle, 0],
    ] as const)
      layers.push({
        part: `${name}-${part}`,
        clip,
        matrix: matrix(origin, target, angle),
        shade: side && !leg ? 0.8 : 1,
      });
  }
  // The lower of the two soles stays on the original world foot anchor.
  const soleOffset = Math.max(
    ...legs.map((l) => l.ankle.y + (482 - (side ? sideLeg.ankle.y : 450))),
  );
  const dy = frame.anchorY - soleOffset;
  for (const layer of layers)
    layer.matrix = [...layer.matrix.slice(0, 5), layer.matrix[5] + dy];
  for (const leg of legs)
    for (const point of [leg.hip, leg.knee, leg.ankle]) point.y += dy;
  layers.splice(3, 0, {
    part: 'body',
    clip: [
      [0, 0],
      [frame.cellWidth, 0],
      [frame.cellWidth, side ? 254 : 263],
      [0, side ? 254 : 263],
    ],
    matrix: [1, 0, 0, 1, 0, dy],
  });
  const points = layers.flatMap((layer) =>
    layer.clip.map(([x, y]) => ({
      x: layer.matrix[0] * x + layer.matrix[2] * y + layer.matrix[4],
      y: layer.matrix[1] * x + layer.matrix[3] * y + layer.matrix[5],
    })),
  );
  const minX = Math.min(...points.map((q) => q.x)),
    minY = Math.min(...points.map((q) => q.y));
  base.bounds = {
    x: minX,
    y: minY,
    width: Math.max(...points.map((q) => q.x)) - minX,
    height: Math.max(...points.map((q) => q.y)) - minY,
  };
  base.rig = { phase, layers, legs };
  return direction === 'right' ? mirrorPreviewSprite(base) : base;
}
