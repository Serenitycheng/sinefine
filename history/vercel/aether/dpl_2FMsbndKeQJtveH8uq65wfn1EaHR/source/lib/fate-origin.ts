export function sameOriginRequest(request: Request, required = false) {
  const origin = request.headers.get('origin');
  if (!origin) return !required;
  try {
    const source = new URL(origin), target = new URL(request.url);
    // Next dev may use localhost in request.url when the browser used 127.0.0.1.
    // Host is browser-controlled (JavaScript cannot override it); never trust a body URL.
    const host = request.headers.get('host') || target.host;
    const protocol = request.headers.get('x-forwarded-proto') || target.protocol.slice(0, -1);
    return origin === source.origin && source.host === host && source.protocol === `${protocol}:` && request.headers.get('sec-fetch-site') !== 'cross-site';
  } catch { return false; }
}
