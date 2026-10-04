/** Browser play time is independent of movement and the fixed offline round. */
export const FATE_CLOCK_SPEEDS = [0.5, 1, 2, 4] as const;
export type FateClockSpeed = (typeof FATE_CLOCK_SPEEDS)[number];
export const FATE_CLOCK_BASE_RATE = 1 / 6;
export const FATE_CLOCK_SPEED_KEY = 'sinefine-fate-clock-speed-v1';
export const FATE_WALK_PACES = [0.65, 1, 1.4] as const;
export type FateWalkPace = (typeof FATE_WALK_PACES)[number];
export const FATE_WALK_PACE_KEY = 'sinefine-fate-walk-pace-v1';

export function parseFateClockSpeed(value: unknown): FateClockSpeed {
  return (
    FATE_CLOCK_SPEEDS.find(
      (speed) => value === speed || value === String(speed),
    ) ?? 1
  );
}
export function parseFateWalkPace(value: unknown): FateWalkPace {
  return (
    FATE_WALK_PACES.find((pace) => value === pace || value === String(pace)) ??
    1
  );
}
export function clockRate(speed: FateClockSpeed) {
  return FATE_CLOCK_BASE_RATE * speed;
}
export function clockSpeedLabel(speed: FateClockSpeed) {
  return `现实 ${6 / speed} 秒 = 游戏 1 分钟`;
}
export function walkPaceLabel(pace: FateWalkPace) {
  return pace === 0.65 ? '慢走' : pace === 1.4 ? '快走' : '正常';
}
