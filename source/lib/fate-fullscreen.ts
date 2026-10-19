/** Shared by the street and room controls so changing rooms keeps the mode. */
export const GAME_FULLSCREEN_CHANGE = 'fatefullscreenchange';

export function immersiveGame() {
  return document.documentElement.dataset.fateImmersive === 'true';
}

export function setImmersiveGame(active: boolean) {
  if (active) document.documentElement.dataset.fateImmersive = 'true';
  else delete document.documentElement.dataset.fateImmersive;
  document.dispatchEvent(new Event(GAME_FULLSCREEN_CHANGE));
}
