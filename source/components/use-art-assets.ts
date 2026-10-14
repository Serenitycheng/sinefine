'use client';
import { useEffect, useState } from 'react';
import { loadArtImages } from '@/lib/fate-art-loader';

export function useArtAssets(files: readonly string[], retry = 0) {
  const key = JSON.stringify([...new Set(files)].sort());
  const [state, setState] = useState<{
    key: string;
    retry: number;
    status: 'ready' | 'error';
  } | null>(null);
  useEffect(() => {
    let active = true;
    void loadArtImages(JSON.parse(key) as string[]).then(
      () => {
        if (active) setState({ key, retry, status: 'ready' });
      },
      () => {
        if (active) setState({ key, retry, status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [key, retry]);
  return state?.key === key && state.retry === retry ? state.status : 'loading';
}
