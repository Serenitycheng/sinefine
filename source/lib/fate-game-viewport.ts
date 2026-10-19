/** Fit the 16:9 painting without turning a wide monitor into a thin strip. */
export function gameViewportSize(width: number, height: number) {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  if (width / height <= 0.8) return { width, height };
  const scale = Math.min(width / 16, height / 9);
  return { width: scale * 16, height: scale * 9 };
}
