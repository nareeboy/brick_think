// lib/changelog/types.ts
import type { ChangelogCategory } from './constants';

export type ChangelogStatus = 'draft' | 'published';

// One published entry as the public page consumes it.
export interface PublicChangelogEntry {
  id: string;
  title: string;
  bodyHtml: string;
  category: ChangelogCategory;
  versionTag: string | null;
  publishedAt: string; // never null on the public surface
  bannerUrl: string | null; // resolved public URL, cache-busted; null when unset
}

// Admin list row (no body — keeps the list query light).
export interface ChangelogListItem {
  id: string;
  title: string;
  category: ChangelogCategory;
  versionTag: string | null;
  status: ChangelogStatus;
  publishedAt: string | null;
  updatedAt: string;
}

// Full row for the admin editor.
export interface AdminChangelogEntry extends ChangelogListItem {
  bodyHtml: string;
  bannerUrl: string | null; // resolved public URL, cache-busted; null when unset
}

// A month bucket for the public single-scrolling page.
export interface ChangelogMonthGroup {
  monthLabel: string; // e.g. "June 2026"
  entries: PublicChangelogEntry[];
}
