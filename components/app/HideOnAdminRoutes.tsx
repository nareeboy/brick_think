'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The admin area is a self-contained dashboard shell — its sidebar carries
 * navigation, back-to-app, and sign-out, so the global header is suppressed
 * on every /app/admin route.
 */
export function HideOnAdminRoutes({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  if (pathname === '/app/admin' || pathname.startsWith('/app/admin/')) return null;
  return <>{children}</>;
}
