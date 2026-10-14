import copies from './fate-runtime-art-data.json';

/** Originals and their registered coordinates stay intact. */
export function runtimeArt(file: string) {
  return (copies as Record<string, string>)[file] ?? file;
}
