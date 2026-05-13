import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ExpiredLinkPage } from '@/components/share/ExpiredLinkPage';
import { ShareView } from '@/components/share/ShareView';
import { getCanvasForToken } from '@/lib/share/getCanvasForToken';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Shared design · BrickThink',
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getCanvasForToken(token);

  if (result.status === 'not_found') notFound();
  if (result.status === 'expired' || result.status === 'revoked') {
    return <ExpiredLinkPage />;
  }
  return <ShareView title={result.title} canvasState={result.canvasState} />;
}
