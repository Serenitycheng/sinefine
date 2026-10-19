import natalia from './fate-natalia-frame-clips.json';

/** Old sheets are not all four-column atlases. Share the same cut in every fallback view. */
export function streetSpriteCell(id: string, phase: number) {
  const columns = id === 'natalia' ? 3 : 4;
  const frame =
    id === 'natalia'
      ? phase > 0
        ? 1 + ((Math.trunc(phase) - 1) % 2)
        : 0
      : Math.max(0, Math.trunc(phase)) % 4;
  const clip =
    id === 'natalia'
      ? (
          natalia as Record<string, { polygon: readonly (readonly number[])[] }>
        )[frame].polygon
      : undefined;
  return {
    columns,
    frame,
    clipPath: clip
      ? `polygon(${clip.map(([x, y]) => `${x}% ${y}%`).join(',')})`
      : undefined,
  };
}
