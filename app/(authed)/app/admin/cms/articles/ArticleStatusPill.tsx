import type { ArticleStatus } from '@/lib/articles/types';

const STYLES: Record<ArticleStatus, { bg: string; text: string; dot: string; label: string }> = {
  draft: {
    bg: 'bg-zinc-900/5',
    text: 'text-zinc-700',
    dot: 'bg-zinc-500',
    label: 'Draft',
  },
  published: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    label: 'Published',
  },
};

interface Props {
  status: ArticleStatus;
}

export function ArticleStatusPill({ status }: Props) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md ${style.bg} px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${style.text}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
