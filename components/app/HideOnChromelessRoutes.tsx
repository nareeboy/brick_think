'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Routes that render without the global app chrome (header, chat widget):
// the admin area is a self-contained dashboard shell with its own sidebar,
// and the first-run role question stands alone — no nav to wander off to.
const CHROMELESS_PREFIXES = ['/app/admin', '/app/choose-role'];

export function HideOnChromelessRoutes({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const chromeless = CHROMELESS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (chromeless) return null;
  return <>{children}</>;
}
