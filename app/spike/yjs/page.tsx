import type { Metadata } from 'next';

import { YjsSpikeLoader } from '@/components/spike/loaders';
import { SpikeShell } from '@/components/spike/SpikeShell';

export const metadata: Metadata = {
  title: 'Yjs spike',
};

interface YjsSpikePageProps {
  searchParams: Promise<{ room?: string }>;
}

const DEFAULT_ROOM = 'phase-0-poc';

export default async function YjsSpikePage({ searchParams }: YjsSpikePageProps) {
  const params = await searchParams;
  const room = (
    params.room && /^[a-z0-9_-]+$/i.test(params.room) ? params.room : DEFAULT_ROOM
  ).slice(0, 64);
  const websocketUrl = process.env.NEXT_PUBLIC_YJS_WS_URL ?? 'ws://localhost:1234/yjs';

  return (
    <SpikeShell
      title="Yjs proof-of-concept"
      subtitle="Two browser tabs, one shared Y.Doc, presence cursors. The worker persists snapshots to Postgres after a debounce. Open this page in a second tab to verify."
    >
      <YjsSpikeLoader roomName={room} websocketUrl={websocketUrl} />
    </SpikeShell>
  );
}
