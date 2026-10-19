import type { CityPoint } from './fate-city-layout';
import { cityWalkFacing } from './fate-city-art-controls';
import {
  interiorProject,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import type { PreviewDirection } from './fate-preview-house';

type Rect = CityPoint & { width: number; height: number };
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

/** Match the visible displacement, including a slide along a blocked surface. */
export function interiorWalkFacing(
  from: CityPoint,
  to: CityPoint,
  floor: CityInteriorScene['floor'],
  previous: PreviewDirection,
) {
  const a = interiorProject(from, floor),
    b = interiorProject(to, floor);
  return cityWalkFacing({ x: b.x - a.x, y: b.y - a.y }, previous);
}

/** Labels live in viewport pixels; neither zooming nor an offscreen door hides
 * its route. On very short screens surplus labels remain in the room controls. */
export function interiorDoorGuides(
  screens: readonly CityPoint[],
  size: { width: number; height: number },
  body: Rect,
  reserved: readonly Rect[] = [],
) {
  const width = Math.min(160, size.width - 24),
    height = 36,
    edge = 12;
  const clampX = (x: number) =>
    Math.max(edge + width / 2, Math.min(size.width - edge - width / 2, x));
  const clampY = (y: number) =>
    Math.max(edge + height / 2, Math.min(size.height - edge - height / 2, y));
  const actor = {
    x: body.x - 10,
    y: body.y - 10,
    width: body.width + 20,
    height: body.height + 20,
  };
  const zoom = { x: size.width - 212, y: 0, width: 212, height: 64 };
  const occupied: Rect[] = [...reserved];
  return screens.map((screen) => {
    const wanted = { x: clampX(screen.x), y: clampY(screen.y - 38) };
    const xs = new Set([
      wanted.x,
      clampX(actor.x - width / 2 - 4),
      clampX(actor.x + actor.width + width / 2 + 4),
    ]);
    const ys = new Set([
      wanted.y,
      clampY(actor.y - height / 2 - 4),
      clampY(actor.y + actor.height + height / 2 + 4),
    ]);
    for (let x = edge + width / 2; x <= size.width - edge - width / 2; x += 40)
      xs.add(x);
    xs.add(size.width - edge - width / 2);
    for (
      let y = edge + height / 2;
      y <= size.height - edge - height / 2;
      y += 40
    )
      ys.add(y);
    ys.add(size.height - edge - height / 2);
    const candidates = [...xs]
      .flatMap((x) => [...ys].map((y) => ({ x, y })))
      .sort(
        (a, b) =>
          Math.hypot(a.x - wanted.x, a.y - wanted.y) -
          Math.hypot(b.x - wanted.x, b.y - wanted.y),
      );
    const mark = candidates.find((p) => {
      const rect = { x: p.x - width / 2, y: p.y - height / 2, width, height };
      return (
        !overlaps(rect, actor) &&
        !overlaps(rect, zoom) &&
        !occupied.some((other) => overlaps(rect, other))
      );
    });
    if (!mark) return null;
    occupied.push({
      x: mark.x - width / 2 - 2,
      y: mark.y - height / 2 - 2,
      width: width + 4,
      height: height + 4,
    });
    return {
      ...mark,
      width,
      pinned: Math.hypot(mark.x - screen.x, mark.y + 38 - screen.y) > 2,
    };
  });
}
