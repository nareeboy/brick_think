'use client';

import dynamic from 'next/dynamic';

export const BuilderCanvasLoader = dynamic(
  () => import('./BuilderCanvas').then((m) => m.BuilderCanvas),
  { ssr: false, loading: () => null },
);
