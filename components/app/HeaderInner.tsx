'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function HeaderInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const builderRoute =
    pathname.startsWith('/app/designs/') && !pathname.startsWith('/app/designs/trash');
  return (
    <div
      className={`mx-auto flex h-14 items-center justify-between gap-3 ${
        builderRoute ? 'max-w-[1600px] px-3 md:px-5' : 'max-w-[1200px] px-5'
      }`}
    >
      {children}
    </div>
  );
}
