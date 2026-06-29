import type { Metadata } from 'next';

import { ToastTestClient } from './ToastTestClient';

// Site-admin gate is enforced by the parent admin/layout.tsx (redirects
// non-admins), matching the other pages in this subtree (e.g. banner).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Toast test · BrickThink',
};

export default function AdminToastTestPage() {
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-zinc-950">Toast test</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Fire every in-app notification toast with sample data to check the visual treatment.
      </p>
      <ToastTestClient />
    </div>
  );
}
