'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { FateProvider } from './fate-provider';

/** Independent art previews own no game progress. Keeping them outside the provider also
 * prevents an open game tab from raising a save conflict in a static preview.
 * The integrated city, game, settings and recovery routes share the formal save. */
export function FateRouteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (
    pathname === '/fate/art-sample' ||
    pathname === '/fate/art-sample-3d' ||
    pathname === '/fate/design' ||
    pathname === '/fate/emiya-life'
  )
    return children;
  return <FateProvider>{children}</FateProvider>;
}
