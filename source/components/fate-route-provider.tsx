'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { FateProvider } from './fate-provider';

/** Art previews own no game progress. Keeping them outside the provider also
 * prevents an open game tab from raising a save conflict in a static preview.
 * All existing game, settings and recovery routes retain the same provider. */
export function FateRouteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (
    pathname === '/fate/art-sample' ||
    pathname === '/fate/art-sample-3d' ||
    pathname === '/fate/city-art' ||
    pathname === '/fate/emiya-life'
  )
    return children;
  return <FateProvider>{children}</FateProvider>;
}
