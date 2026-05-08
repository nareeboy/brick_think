import type { Metadata } from 'next';

import { Builder } from '@/components/builder/Builder';

export const metadata: Metadata = {
  title: 'Builder · BT0317',
};

export default function BuilderPage() {
  return <Builder />;
}
