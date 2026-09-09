// Kept outside game saves, histories and exports. Persistence is opt-in on this origin.
export const DEEPSEEK_CONNECTION_KEY = 'sine-fine-deepseek-connection-v1';
export type SavedConnection = { version: 1; key: string; model: string };
type ConnectionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function parseSavedConnection(value: unknown): SavedConnection {
  if (!value || typeof value !== 'object') throw new Error('连接记录无效');
  const x = value as Record<string, unknown>;
  if (x.version !== 1 || typeof x.key !== 'string' || !/^[\x21-\x7e]{8,256}$/.test(x.key) || typeof x.model !== 'string' || !/^[a-zA-Z0-9._:/-]{1,100}$/.test(x.model)) throw new Error('连接记录无效');
  return { version: 1, key: x.key, model: x.model };
}
export function readSavedConnection(storage: ConnectionStorage): SavedConnection | null {
  const raw = storage.getItem(DEEPSEEK_CONNECTION_KEY);
  if (raw === null) return null;
  if (raw.length > 1000) throw new Error('连接记录无效');
  return parseSavedConnection(JSON.parse(raw));
}
export function saveConnection(storage: ConnectionStorage, remember: boolean, value: SavedConnection) {
  if (!remember) { storage.removeItem(DEEPSEEK_CONNECTION_KEY); return; }
  storage.setItem(DEEPSEEK_CONNECTION_KEY, JSON.stringify(parseSavedConnection(value)));
}
export function forgetConnection(storage: ConnectionStorage) { storage.removeItem(DEEPSEEK_CONNECTION_KEY); }
