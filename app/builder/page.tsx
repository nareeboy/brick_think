import type { Metadata } from 'next';

import { Builder } from '@/components/builder/Builder';
import { UserBar } from '@/components/builder/UserBar';

export const metadata: Metadata = {
  title: 'Builder · BT0317',
};

// Public preview of the builder UI. Mirrors /app's shell exactly so UI
// iterations land in both without divergence. The unauth state of UserBar
// hides the email and sign-out and shows "Preview · not signed in" instead.
export default function BuilderPage() {
  return <Builder userBar={<UserBar />} />;
}
