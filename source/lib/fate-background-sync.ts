import type { BackgroundView } from './fate-background';

export const BACKGROUND_SYNC_KEY = 'sine-fine-background-sync-v1';
export type BackgroundSyncMarker = {
  username: string;
  fingerprint: string;
  active: boolean;
};

export function readBackgroundMarker(
  storage?: Pick<Storage, 'getItem'>,
): BackgroundSyncMarker | null {
  try {
    const marker: unknown = JSON.parse(
      (storage ?? globalThis.localStorage).getItem(BACKGROUND_SYNC_KEY) ??
        'null',
    );
    if (!marker || typeof marker !== 'object') return null;
    const value = marker as Partial<BackgroundSyncMarker>;
    return typeof value.username === 'string' &&
      /^[a-z0-9_]{3,32}$/.test(value.username) &&
      typeof value.fingerprint === 'string' &&
      /^[a-f0-9]{64}$/.test(value.fingerprint) &&
      typeof value.active === 'boolean'
      ? (value as BackgroundSyncMarker)
      : null;
  } catch {
    return null;
  }
}

/** A missing reply never proves that a previously started cloud session stopped. */
export function backgroundSyncHold(
  marker: BackgroundSyncMarker | null,
  view: BackgroundView | null,
) {
  const pending = Boolean(
    marker?.active &&
    (!view || view.username !== marker.username || !view.session?.enabled),
  );
  return {
    locked: Boolean(marker?.active || view?.session?.enabled),
    pending,
    username: pending ? marker!.username : null,
  };
}
