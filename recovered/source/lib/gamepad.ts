import type { Point } from './street';

export type PadLike = {
  index: number;
  id: string;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
};
export type PadHistory = { key: string; mask: number } | null;
export type PadAction =
  | 'previous'
  | 'next'
  | 'observe'
  | 'center'
  | 'talk'
  | 'back';
export const STICK_DEADZONE = 0.18;

export function stickVector(rawX = 0, rawY = 0): Point {
  const x = Number.isFinite(rawX) ? Math.max(-1, Math.min(1, rawX)) : 0;
  const y = Number.isFinite(rawY) ? Math.max(-1, Math.min(1, rawY)) : 0;
  const magnitude = Math.hypot(x, y);
  if (magnitude <= STICK_DEADZONE) return { x: 0, y: 0 };
  const strength = Math.min(
    1,
    (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE),
  );
  return { x: (x / magnitude) * strength, y: (y / magnitude) * strength };
}
export function pickGamepad(
  pads: readonly (PadLike | null)[],
  preferredIndex: number | null,
): PadLike | null {
  return (
    pads.find((p) => p?.connected && p.index === preferredIndex) ??
    pads.find((p) => p?.connected && p.mapping === 'standard') ??
    pads.find((p) => p?.connected) ??
    null
  );
}
export function readGamepad(pad: PadLike | null, previous: PadHistory) {
  if (!pad?.connected)
    return {
      move: { x: 0, y: 0 },
      look: { x: 0, y: 0 },
      actions: [] as PadAction[],
      history: null as PadHistory,
    };
  const standard = pad.mapping === 'standard';
  const pressed = (i: number) =>
    Boolean(pad.buttons[i]?.pressed || pad.buttons[i]?.value > 0.5);
  let move = stickVector(pad.axes[0], pad.axes[1]);
  if (standard) {
    const x = Number(pressed(15)) - Number(pressed(14)),
      y = Number(pressed(13)) - Number(pressed(12));
    if ([12, 13, 14, 15].some(pressed)) {
      const length = Math.hypot(x, y) || 1;
      move = { x: x / length, y: y / length };
    }
  }
  const look = standard
    ? stickVector(pad.axes[2], pad.axes[3])
    : { x: 0, y: 0 };
  const bindings: [number, PadAction][] = [
    [4, 'previous'],
    [5, 'next'],
    [3, 'observe'],
    [9, 'center'],
    [0, 'talk'],
    [1, 'back'],
  ];
  const mask = standard
    ? bindings.reduce(
        (bits, [button]) => (pressed(button) ? bits | (1 << button) : bits),
        0,
      )
    : 0;
  const key = `${pad.index}:${pad.id}`;
  // Seed held buttons on connection or refocus; only later presses trigger actions.
  const actions =
    previous?.key === key
      ? bindings
          .filter(
            ([button]) =>
              mask & (1 << button) && !(previous.mask & (1 << button)),
          )
          .map(([, action]) => action)
      : [];
  return { move, look, actions, history: { key, mask } as PadHistory };
}
