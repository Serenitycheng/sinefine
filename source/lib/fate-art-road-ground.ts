import type { SamplePoint } from './fate-art-sample';

// Independently traced from the four road paintings. Registration describes
// where a world point is drawn; it cannot establish that the painted pixel is
// pavement. These outlines keep feet clear of actual walls, pots and bicycles.
export const ROAD_FLOORS = {
  'street-eye': [
    [0, 705],
    [145, 664],
    [170, 613],
    [312, 580],
    [558, 508],
    [600, 491],
    [610, 455],
    [690, 450],
    [755, 436],
    [800, 423],
    [847, 421],
    [883, 414],
    [895, 412],
    [976, 380],
    [1048, 351],
    [1108, 345],
    [1120, 349],
    [1140, 360],
    [1180, 387],
    [1230, 418],
    [1280, 456],
    [1350, 494],
    [1450, 550],
    [1550, 609],
    [1672, 680],
    [1672, 941],
    [0, 941],
  ],
  'street-along': [
    [80, 925],
    [165, 827],
    [246, 760],
    [340, 700],
    [490, 553],
    [578, 451],
    [640, 345],
    // Open paving between the bicycle's rear wheel and the cafe doorstep.
    // The old diagonal cut across these tiles and split the door approach.
    [704, 316],
    [738, 288],
    [766, 280],
    [806, 255],
    [840, 242],
    [848, 202],
    [934, 106],
    [1000, 5],
    [1170, 5],
    [1200, 135],
    [1239, 290],
    [1260, 395],
    [1303, 560],
    [1372, 800],
    [1437, 941],
    [80, 941],
  ],
  'neighborhood-eye': [
    [0, 725],
    [55, 693],
    [132, 651],
    [224, 607],
    [314, 578],
    [406, 566],
    [538, 535],
    [570, 522],
    [603, 500],
    [669, 496],
    [790, 463],
    [880, 438],
    [949, 418],
    [988, 402],
    [1010, 397],
    [1046, 396],
    [1083, 423],
    [1140, 478],
    [1201, 530],
    [1260, 542],
    [1305, 539],
    [1454, 535],
    [1470, 572],
    [1500, 592],
    [1525, 654],
    [1570, 707],
    [1648, 756],
    [1672, 767],
    [1672, 941],
    [0, 941],
  ],
  'neighborhood-along': [
    [70, 941],
    [88, 865],
    [151, 783],
    [196, 678],
    [250, 629],
    [280, 543],
    [317, 509],
    [393, 483],
    [450, 444],
    [467, 402],
    [508, 385],
    [641, 280],
    [686, 248],
    [765, 177],
    [842, 109],
    [927, 5],
    [1078, 5],
    [1107, 202],
    [1136, 346],
    [1195, 413],
    [1227, 432],
    [1255, 413],
    [1408, 413],
    [1420, 478],
    [1400, 523],
    [1455, 569],
    [1460, 669],
    [1510, 711],
    [1590, 813],
    [1638, 941],
  ],
} as const;

export type RoadFloorView = keyof typeof ROAD_FLOORS;

/** Only the connected upper sidewalk may extend the older overview outline.
 * The independent paintings still reject each wall and prop within this band;
 * their distant foreground must not open a new exit beyond the scene. */
export function onRoadSidewalk(
  point: SamplePoint,
  area: 'street' | 'neighborhood',
) {
  const [left, right, startY, endY, depth] =
    area === 'street' ? [120, 1618, 696, 285, 60] : [190, 1610, 490, 170, 75];
  if (point.x < left || point.x > right) return false;
  const edge = startY + ((point.x - left) * (endY - startY)) / (right - left);
  return point.y >= edge - depth && point.y <= edge;
}

export function onRoadFloor(point: SamplePoint, view: RoadFloorView) {
  const polygon = ROAD_FLOORS[view];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i],
      [bx, by] = polygon[j];
    if (
      ay > point.y !== by > point.y &&
      point.x < ((bx - ax) * (point.y - ay)) / (by - ay) + ax
    )
      inside = !inside;
  }
  return inside;
}
