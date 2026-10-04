'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFate } from './fate-provider';
import {
  BACKGROUND_PATH,
  backgroundFingerprint,
  parseBackgroundView,
  type BackgroundView,
} from '@/lib/fate-background';
import {
  createFateAccountRequests,
  requestFateJson,
  type FateAccountRequest,
} from '@/lib/fate-cloud-client';
import {
  BACKGROUND_SYNC_KEY,
  backgroundSyncHold,
  readBackgroundMarker,
  type BackgroundSyncMarker,
} from '@/lib/fate-background-sync';

async function send(
  signal: AbortSignal,
  body?: unknown,
): Promise<BackgroundView> {
  return parseBackgroundView(
    await requestFateJson(BACKGROUND_PATH, {
      method: body === undefined ? 'GET' : 'PUT',
      body,
      signal,
    }),
  );
}
export function useBackgroundLife() {
  const fate = useFate();
  const ctx = useRef(fate);
  const [view, setView] = useState<BackgroundView | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const [marker, setMarker] = useState<BackgroundSyncMarker | null>(null);
  const [markerLoaded, setMarkerLoaded] = useState(false);
  const requests = useRef(createFateAccountRequests());
  const mounted = useRef(true);
  const account = useRef(fate.cloudUsername);
  useEffect(() => {
    const pending = requests.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.cancel();
    };
  }, []);
  useEffect(() => {
    let live = true;
    const read = () => {
      if (!live) return;
      setMarker(readBackgroundMarker());
      setMarkerLoaded(true);
    };
    queueMicrotask(read);
    const changed = (event: StorageEvent) => {
      if (event.key === BACKGROUND_SYNC_KEY || event.key === null) read();
    };
    window.addEventListener('storage', changed);
    return () => {
      live = false;
      window.removeEventListener('storage', changed);
    };
  }, []);
  const writeMarker = useCallback((next: BackgroundSyncMarker | null) => {
    if (next) localStorage.setItem(BACKGROUND_SYNC_KEY, JSON.stringify(next));
    else localStorage.removeItem(BACKGROUND_SYNC_KEY);
    setMarker(next);
  }, []);
  useEffect(() => {
    ctx.current = fate;
    account.current = fate.cloudUsername;
  });
  const isCurrent = useCallback(
    (request: FateAccountRequest) =>
      mounted.current &&
      account.current === request.username &&
      requests.current.isCurrent(request),
    [],
  );
  const accept = useCallback(
    async (
      next: BackgroundView,
      request: FateAccountRequest,
      force = false,
    ) => {
      if (
        !isCurrent(request) ||
        next.username !== request.username ||
        ctx.current.storageBlocked
      )
        return;
      const session = next.session;
      const stored = readBackgroundMarker();
      const marker = stored?.username === next.username ? stored : null;
      if (stored?.active && stored.username !== next.username) {
        setView(next);
        setConflict(false);
        return;
      }
      if (!session) {
        if (marker) writeMarker(null);
        setView(next);
        setConflict(false);
        return;
      }
      if (session.enabled)
        writeMarker({
          username: next.username,
          // A conflict must remain a conflict after retry; do not treat an
          // unrelated local snapshot as a previously synchronized origin.
          fingerprint: marker?.fingerprint ?? session.origin,
          active: true,
        });
      const local = ctx.current.exportBackup();
      const serialized = JSON.stringify(local.save);
      const current = await backgroundFingerprint(local);
      const cloud = await backgroundFingerprint(session.backup);
      if (!isCurrent(request) || ctx.current.storageBlocked) return;
      setView(next);
      // The local engine is frozen while a cloud session is active. Before every
      // replacement, verify that this device has not diverged in another tab.
      if (session.enabled || marker?.active || force) {
        // Hashing is asynchronous: a restore or another tab can change the save
        // while it runs, even when the initial snapshot matched the cloud origin.
        if (JSON.stringify(ctx.current.exportBackup().save) !== serialized) {
          setConflict(true);
          return;
        }
        if (
          force ||
          current === session.origin ||
          current === marker?.fingerprint ||
          current === cloud
        ) {
          if (current !== cloud) ctx.current.restoreBackup(session.backup);
          writeMarker({
            username: next.username,
            fingerprint: cloud,
            active: session.enabled,
          });
          setConflict(false);
        } else setConflict(true);
      }
    },
    [isCurrent, writeMarker],
  );
  const refresh = useCallback(async () => {
    const username = account.current;
    if (!username || !ctx.current.loaded) return;
    const request = requests.current.begin(username);
    if (!request) return;
    try {
      const next = await send(request.signal);
      if (isCurrent(request)) {
        if (next.username !== username)
          throw new Error('游戏账号已变更，请重新登录后读取后台状态。');
        await accept(next, request);
        if (isCurrent(request)) setNotice('');
      }
    } catch (error) {
      if (isCurrent(request))
        setNotice(
          error instanceof Error ? error.message : '后台日常暂时不可用。',
        );
    } finally {
      if (
        requests.current.finish(request) &&
        mounted.current &&
        account.current === username
      )
        setLoading(false);
    }
  }, [accept, isCurrent]);
  useEffect(() => {
    const pending = requests.current;
    let live = true;
    queueMicrotask(() => {
      if (!live) return;
      setView(null);
      setConflict(false);
      setNotice('');
      setBusy(false);
      setLoading(false);
      if (fate.cloudUsername && fate.loaded) {
        setLoading(true);
        void refresh();
      }
    });
    const focus = () => {
      if (!document.hidden) void refresh();
    };
    const timer = window.setInterval(focus, 60_000);
    window.addEventListener('focus', focus);
    return () => {
      live = false;
      pending.cancel();
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [fate.cloudUsername, fate.loaded, refresh]);
  async function change(enabled: boolean, keepLocal = false) {
    const stored = readBackgroundMarker();
    if (stored?.active && stored.username !== view?.username) {
      setNotice(
        `请先登录账号 ${stored.username}，确认暂停后台后再继续本地日常。`,
      );
      return;
    }
    if (enabled && backgroundSyncHold(stored, view).pending) {
      setNotice('后台状态尚未确认，请先重新读取，再选择接回进度。');
      return;
    }
    if (
      busy ||
      !view ||
      account.current !== view.username ||
      fate.storageBlocked ||
      (enabled ? !fate.cloudSaved : !view.session)
    )
      return;
    // An explicit change supersedes an older status read. Polling never runs
    // alongside a write or clears its busy state when a late read finishes.
    const request = requests.current.begin(view.username, true);
    if (!request) return;
    setBusy(true);
    setLoading(false);
    setNotice('');
    try {
      // Let suspension stop the street engine and publish the latest position.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (!isCurrent(request)) return;
      const backup = enabled
        ? ctx.current.exportBackup('开启后台前的进度')
        : undefined;
      const fingerprint = backup
        ? await backgroundFingerprint(backup)
        : undefined;
      if (!isCurrent(request) || ctx.current.storageBlocked) return;
      // Persist the handoff before sending: a lost PUT response may still mean
      // the server accepted it. A successful status read clears this guard.
      if (fingerprint)
        writeMarker({
          username: request.username,
          fingerprint,
          active: true,
        });
      const next = await send(request.signal, {
        enabled,
        expectedAccount: view.username,
        expectedRevision: view.session?.revision ?? null,
        ...(backup ? { backup } : {}),
      });
      if (!isCurrent(request)) return;
      if (next.username !== request.username)
        throw new Error('账号已变更，本次操作未应用到当前页面。');
      if (keepLocal) {
        writeMarker(null);
        setView(next);
        setConflict(false);
      } else await accept(next, request, !enabled);
    } catch (error) {
      if (!isCurrent(request)) return;
      requests.current.finish(request);
      await refresh();
      if (mounted.current && account.current === request.username) {
        setBusy(false);
        setNotice(
          error instanceof Error
            ? error.message
            : '后台切换未确认，请重新读取后再试。',
        );
      }
    } finally {
      if (
        requests.current.finish(request) &&
        mounted.current &&
        account.current === request.username
      )
        setBusy(false);
    }
  }
  const hold = backgroundSyncHold(marker, view);
  return {
    view,
    loading,
    busy,
    conflict,
    notice,
    recoveryPending: hold.pending,
    recoveryAccount: hold.username,
    start: () => change(true),
    stop: (keepLocal = false) => change(false, keepLocal),
    refresh,
    suspended:
      !markerLoaded ||
      fate.cloudAccountLoading ||
      loading ||
      busy ||
      conflict ||
      hold.locked,
  };
}
