// components/banner/SiteBanner.tsx
import { getActiveBanner } from '@/lib/banner/queries';

import { SiteBannerClient } from './SiteBannerClient';

// Async RSC mounted at the very top of the root layout body. Renders nothing
// on the common path (no active banner). The inline script after the banner
// hides a previously-dismissed banner before paint to avoid a flash; the
// client component reconciles the same state on hydration.
export async function SiteBanner() {
  const banner = await getActiveBanner();
  if (!banner) return null;
  return (
    <>
      <SiteBannerClient type={banner.type} message={banner.message} version={banner.version} />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{var b=document.getElementById('site-banner');" +
            "if(b&&localStorage.getItem('bt-banner-dismissed')===b.dataset.bannerVersion){b.style.display='none';}}catch(e){}})();",
        }}
      />
    </>
  );
}
