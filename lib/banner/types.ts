// lib/banner/types.ts
import type { BannerType } from './constants';

// What the public banner component consumes.
export interface SiteBanner {
  type: BannerType;
  message: string;
  // The row's updated_at (ISO). Used as the per-visitor dismissal version:
  // bumping it on save re-shows the banner to anyone who dismissed the old one.
  version: string;
}

// The full singleton row as the admin editor consumes it.
export interface AdminSiteBanner extends SiteBanner {
  isActive: boolean;
}
