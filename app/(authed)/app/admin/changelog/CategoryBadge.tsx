// app/(authed)/app/admin/changelog/CategoryBadge.tsx
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  type ChangelogCategory,
} from '@/lib/changelog/constants';

export function CategoryBadge({ category }: { category: ChangelogCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${CATEGORY_STYLES[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
