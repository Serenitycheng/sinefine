import { runtimeArt } from './fate-runtime-art';

type Priority = 'high' | 'low';
type Entry = {
  image: HTMLImageElement | null;
  promise: Promise<void>;
  ready?: boolean;
};
const images = new Map<string, Entry>();

/** A CSS background must finish decoding before its actor and shadow appear. */
export function loadArtImage(original: string, priority: Priority = 'high') {
  const file = runtimeArt(original),
    cached = images.get(file);
  if (cached) {
    if (priority === 'high' && cached.image)
      cached.image.fetchPriority = 'high';
    return cached.promise;
  }
  const image = new window.Image();
  image.decoding = 'async';
  image.fetchPriority = priority;
  const entry = { image, promise: Promise.resolve() } as Entry;
  entry.promise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Image timed out: ${original}`)),
      20000,
    );
    const fail = (error: unknown) => {
      clearTimeout(timeout);
      reject(error);
    };
    image.onload = () => {
      void image.decode().then(() => {
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        entry.image = null;
        entry.ready = true;
        resolve();
      }, fail);
    };
    image.onerror = () => fail(new Error(`Image unavailable: ${original}`));
    image.src = file;
  }).catch((error: unknown) => {
    image.onload = image.onerror = null;
    images.delete(file);
    throw error;
  });
  images.set(file, entry);
  return entry.promise;
}

/** One low-priority warm-up at a time; foreground requests reuse and promote it. */
let warmLane = Promise.resolve();
export function warmArtImages(
  files: readonly string[],
  wanted: () => boolean = () => true,
) {
  if (typeof window === 'undefined') return;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? ''))
    return;
  for (const file of new Set(files))
    warmLane = warmLane.then(async () => {
      if (!wanted() || images.get(runtimeArt(file))?.ready) return;
      await loadArtImage(file, 'low').catch(() => {});
    });
}

export function loadArtImages(
  files: readonly string[],
  priority: Priority = 'high',
) {
  return Promise.all(
    [...new Set(files)].map((file) => loadArtImage(file, priority)),
  );
}
