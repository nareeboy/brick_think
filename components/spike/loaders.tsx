'use client';

import dynamic from 'next/dynamic';

const Loading = ({ label }: { label: string }) => (
  <p className="text-sm text-muted-foreground" role="status">
    {label}
  </p>
);

export const KonvaInteractiveLoader = dynamic(
  () => import('./KonvaInteractive').then((m) => m.KonvaInteractive),
  { ssr: false, loading: () => <Loading label="Loading canvas..." /> },
);

export const KonvaBenchLoader = dynamic(() => import('./KonvaBench').then((m) => m.KonvaBench), {
  ssr: false,
  loading: () => <Loading label="Loading benchmark..." />,
});

export const PixiInteractiveLoader = dynamic(
  () => import('./PixiInteractive').then((m) => m.PixiInteractive),
  { ssr: false, loading: () => <Loading label="Loading canvas..." /> },
);

export const PixiBenchLoader = dynamic(() => import('./PixiBench').then((m) => m.PixiBench), {
  ssr: false,
  loading: () => <Loading label="Loading benchmark..." />,
});

export const YjsSpikeLoader = dynamic(() => import('./YjsSpike').then((m) => m.YjsSpike), {
  ssr: false,
  loading: () => <Loading label="Connecting to the Yjs server..." />,
});
