'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFate } from './fate-provider';
import {
  BACKGROUND_PATH,
  backgroundFingerprint,
  parseBackgroundView,
  type BackgroundView,
} from '@/lib/fate-background';

const MARKER = 'sine-fine-background-sync-v1';
type Marker = { username: string; fingerprint: string; active: boolean };
async function send(body?: unknown): Promise<BackgroundView> {
  const response = await fetch(BACKGROUND_PATH, {
    method: body ? 'PUT' : 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '未能读取后台日常。');
  return parseBackgroundView(data);
}
function readMarker(username: string): Marker | null {
  try {
    const m = JSON.parse(
      localStorage.getItem(MARKER) ?? 'null',
    ) as Marker | null;
    return m?.username === username &&
      /^[a-f0-9]{64}$/.test(m.fingerprint) &&
      typeof m.active === 'boolean'
      ? m
      : null;
  } catch {
    return null;
  }
}
export function useBackgroundLife() {
  const fate = useFate();
  const ctx = useRef(fate);
  const [view, setView] = useState<BackgroundView | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const flight = useRef(false);
  const mounted = useRef(true);
  const account = useRef(fate.cloudUsername);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    ctx.current = fate;
    account.current = fate.cloudUsername;
  });
  const accept = useCallback(async (next: BackgroundView, force = false) => {
    if (
      !mounted.current ||
      account.current !== next.username ||
      ctx.current.storageBlocked
    )
      return;
    const session = next.session;
    if (!session) {
      setView(next);
      setConflict(false);
      return;
    }
    const marker = readMarker(next.username);
    const current = await backgroundFingerprint(ctx.current.exportBackup());
    const cloud = await backgroundFingerprint(session.backup);
    if (!mounted.current || account.current !== next.username) return;
    setView(next);
    // The local engine is frozen while a cloud session is active. Before every
    // replacement, verify that this device has not diverged in another tab.
    if (session.enabled || marker?.active || force) {
      if (
        force ||
        current === session.origin ||
        current === marker?.fingerprint ||
        current === cloud
      ) {
        if (current !== cloud) ctx.current.restoreBackup(session.backup);
        localStorage.setItem(
          MARKER,
          JSON.stringify({
            username: next.username,
            fingerprint: cloud,
            active: session.enabled,
          } satisfies Marker),
        );
        setConflict(false);
      } else setConflict(true);
    }
  }, []);
  const refresh = useCallback(async () => {
    const username = account.current;
    if (!username || !ctx.current.loaded || flight.current) return;
    flight.current = true;
    try {
      const next = await send();
      if (account.current === username) {
        await accept(next);
        setNotice('');
      }
    } catch (error) {
      if (account.current === username)
        setNotice(
          error instanceof Error ? error.message : '后台日常暂时不可用。',
        );
    } finally {
      flight.current = false;
      setLoading(false);
    }
  }, [accept]);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (!live) return;
      setView(null);
      setConflict(false);
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
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [fate.cloudUsername, fate.loaded, refresh]);
  async function start() {
    if (busy || !view || !fate.cloudSaved) return;
    setBusy(true);
    setNotice('');
    try {
      // Let suspension stop the street engine and publish the latest position.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const backup = ctx.current.exportBackup('开启后台前的进度');
      const next = await send({
        enabled: true,
        expectedAccount: view.username,
        expectedRevision: view.session?.revision ?? null,
        backup,
      });
      if (!mounted.current || account.current !== view.username) return;
      setView(next);
      const fingerprint = await backgroundFingerprint(backup);
      localStorage.setItem(
        MARKER,
        JSON.stringify({
          username: view.username,
          fingerprint,
          active: true,
        } satisfies Marker),
      );
      await accept(next);
    } catch (error) {
      await refresh();
      setNotice(error instanceof Error ? error.message : '未能开启后台。');
    } finally {
      setBusy(false);
    }
  }
  async function stop(keepLocal = false) {
    if (busy || !view?.session) return;
    setBusy(true);
    setNotice('');
    try {
      const next = await send({
        enabled: false,
        expectedAccount: view.username,
        expectedRevision: view.session.revision,
      });
      if (!mounted.current || account.current !== view.username) return;
      if (keepLocal) {
        localStorage.removeItem(MARKER);
        setView(next);
        setConflict(false);
      } else await accept(next, true);
    } catch (error) {
      await refresh();
      setNotice(
        error instanceof Error
          ? error.message
          : '未能暂停后台，请重新读取后再试。',
      );
    } finally {
      setBusy(false);
    }
  }
  return {
    view,
    loading,
    busy,
    conflict,
    notice,
    start,
    stop,
    refresh,
    suspended:
      fate.cloudConfigured === null ||
      loading ||
      busy ||
      conflict ||
      Boolean(view?.session?.enabled),
  };
}
