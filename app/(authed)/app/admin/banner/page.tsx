// app/(authed)/app/admin/banner/page.tsx
import { getBannerForAdmin } from '@/lib/banner/queries';

import { BannerSettingsForm } from './BannerSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminBannerPage() {
  const banner = await getBannerForAdmin();
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-zinc-950">Banner</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Configure the global banner that appears at the top of every page.
      </p>
      <BannerSettingsForm initial={banner} />
    </div>
  );
}
