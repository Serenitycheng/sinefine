import type { CityPoint } from './fate-city-layout';
import type { InteriorFurniture } from './fate-city-interior-scenes';

export const furnitureSolids = (f: InteriorFurniture) =>
  f.collisions ?? [
    f.collision ?? [
      { x: f.footprint.x, y: f.footprint.y },
      { x: f.footprint.x + f.footprint.width, y: f.footprint.y },
      {
        x: f.footprint.x + f.footprint.width,
        y: f.footprint.y + f.footprint.height,
      },
      { x: f.footprint.x, y: f.footprint.y + f.footprint.height },
    ],
  ];

export function insideInteriorShape(p: CityPoint, poly: readonly CityPoint[]) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      yes = !yes;
  }
  return yes;
}
