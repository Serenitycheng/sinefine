import { runtimeArt } from './fate-runtime-art';

type Priority = 'high' | 'low';
type Entry = { image: HTMLImageElement | null; promise: Promise<void> };
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
    image.onload = () => {
      void image.decode().then(() => {
        image.onload = image.onerror = null;
        entry.image = null;
        resolve();
      }, reject);
    };
    image.onerror = () => reject(new Error(`Image unavailable: ${original}`));
    image.src = file;
  }).catch((error: unknown) => {
    image.onload = image.onerror = null;
    images.delete(file);
    throw error;
  });
  images.set(file, entry);
  return entry.promise;
}

export function loadArtImages(
  files: readonly string[],
  priority: Priority = 'high',
) {
  return Promise.all(
    [...new Set(files)].map((file) => loadArtImage(file, priority)),
  );
}
