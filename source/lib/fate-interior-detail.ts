import type { CityPoint } from './fate-city-layout';

/** Crop the painted object, independently of the actor's floor position/camera. */
export function interiorDetailCrop(target: CityPoint, width = 360) {
  width = Math.max(160, Math.min(720, width));
  const height = (width * 5) / 8;
  return {
    x: Math.max(0, Math.min(1600 - width, target.x - width / 2)),
    y: Math.max(0, Math.min(900 - height, target.y - height / 2)),
    width,
    height,
  };
}

export function interiorObjectFrame(target: CityPoint, label: string) {
  const width = /窗|书架|书柜|床|沙发|衣柜|水槽|灶台|包装台/.test(label)
    ? 520
    : /书|笔记|茶|杯|花|钟|工具|相片|照片|收音|陶盆/.test(label)
      ? 300
      : 380;
  return interiorDetailCrop(target, width);
}
