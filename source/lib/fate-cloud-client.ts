const REQUEST_TIMEOUT_MS = 20_000;

export class FateCloudTimeout extends Error {
  constructor() {
    super(
      '云端连接超时，请检查网络后重试。切换操作可能已在云端完成，请刷新状态确认。',
    );
    this.name = 'FateCloudTimeout';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

/** The deadline covers both response headers and the complete JSON body. */
export async function requestFateJson<T>(
  path: string,
  {
    method = 'GET',
    body,
    signal,
    timeoutMs = REQUEST_TIMEOUT_MS,
    fetcher = fetch,
  }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  try {
    controller.signal.throwIfAborted();
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(
        () => controller.abort(new FateCloudTimeout()),
        timeoutMs,
      );
    });
    const response = (async () => {
      const reply = await fetcher(path, {
        method,
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const data: unknown = await reply.json();
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new Error('云端返回的内容无法读取，请稍后重试。');
      if (!reply.ok) {
        const error = (data as { error?: unknown }).error;
        throw new Error(
          typeof error === 'string' ? error : '云端暂时不可用，请重试。',
        );
      }
      return data as T;
    })();
    return await Promise.race([response, cancelled]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
  }
}

export type FateAccountRequest = { username: string; signal: AbortSignal };

/** A late reply or cleanup from a previous account cannot finish a new request. */
export function createFateAccountRequests() {
  let active: (FateAccountRequest & { controller: AbortController }) | null =
    null;
  function cancel() {
    active?.controller.abort();
    active = null;
  }
  return {
    cancel,
    begin(username: string, replace = false): FateAccountRequest | null {
      if (active && active.username === username && !replace) return null;
      cancel();
      const controller = new AbortController();
      active = { username, signal: controller.signal, controller };
      return active;
    },
    isCurrent(request: FateAccountRequest) {
      return active === request && !request.signal.aborted;
    },
    finish(request: FateAccountRequest) {
      if (active !== request) return false;
      active = null;
      return true;
    },
  };
}
