'use client';

import { useMemo, useState, useTransition, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

import {
  ARTICLE_BODY_MAX,
  ARTICLE_EXCERPT_MAX,
  ARTICLE_TITLE_MAX,
} from '@/lib/articles/constants';
import { renderMarkdown } from '@/lib/articles/markdown';
import { isValidSlug, slugify } from '@/lib/articles/slug';
import type { ArticleDetail } from '@/lib/articles/types';

import {
  createArticleAction,
  publishArticleAction,
  unpublishArticleAction,
  updateArticleAction,
  type ArticleActionResult,
} from './actions';
import { ArticleStatusPill } from './ArticleStatusPill';
import { CoverImageField } from './CoverImageField';

interface Props {
  mode: 'new' | 'edit';
  article?: ArticleDetail;
}

const CODE_MESSAGES: Record<string, string> = {
  invalid_title: 'Title is required (up to 200 characters).',
  invalid_slug:
    'Slug must be lowercase letters, numbers, and dashes (no leading/trailing dash). Max 120 chars.',
  invalid_excerpt: 'Excerpt is too long.',
  invalid_body: 'Body is too long.',
  invalid_cover: 'Cover image must be a PNG ≤ 2 MB.',
  slug_taken: 'That slug is already used by another article. Pick another.',
  forbidden: 'You no longer have admin access. Reload and try again.',
  unauthenticated: 'Sign in again to continue.',
  not_found: 'This article no longer exists.',
  unknown: 'Something went wrong. Try again.',
};

function messageFor(result: ArticleActionResult): string | null {
  if (result.ok) return null;
  return CODE_MESSAGES[result.code] ?? result.message ?? CODE_MESSAGES.unknown ?? null;
}

export function ArticleEditor({ mode, article }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? '');
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(article?.slug));
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [body, setBody] = useState(article?.bodyMarkdown ?? '');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [publishPending, startPublishTransition] = useTransition();

  function handleTitle(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setTitle(next);
    if (!slugTouched) setSlug(slugify(next));
  }

  function handleSlug(e: ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    setSlugTouched(true);
  }

  const slugLooksValid = slug.length === 0 || isValidSlug(slug);
  const titleLooksValid = title.trim().length > 0 && title.length <= ARTICLE_TITLE_MAX;

  const previewHtml = useMemo(() => renderMarkdown(body), [body]);

  const status = article?.status ?? 'draft';

  function submit() {
    setError(null);
    const fd = new FormData();
    if (article?.id) fd.set('id', article.id);
    fd.set('title', title);
    fd.set('slug', slug || slugify(title));
    fd.set('excerpt', excerpt);
    fd.set('body', body);
    startTransition(async () => {
      const result = mode === 'new' ? await createArticleAction(fd) : await updateArticleAction(fd);
      // create redirects on success; only failures land here.
      if (!result.ok) {
        setError(messageFor(result));
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  function togglePublish() {
    if (!article) return;
    setError(null);
    startPublishTransition(async () => {
      const result =
        status === 'published'
          ? await unpublishArticleAction(article.id)
          : await publishArticleAction(article.id);
      if (!result.ok) {
        setError(messageFor(result));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            CMS / Articles
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl tracking-tight text-zinc-900">
              {mode === 'new' ? 'New article' : article?.title || 'Untitled'}
            </h1>
            {article ? <ArticleStatusPill status={status} /> : null}
          </div>
          {article ? (
            <p className="text-[13px] text-zinc-600">
              /{article.slug}
              {article.publishedAt
                ? ` · first published ${new Date(article.publishedAt).toLocaleString()}`
                : ''}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {article ? (
            <button
              type="button"
              onClick={togglePublish}
              disabled={publishPending}
              className={`inline-flex h-10 cursor-pointer items-center rounded-xl px-4 text-[13px] font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${
                status === 'published'
                  ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {status === 'published'
                ? publishPending
                  ? 'Unpublishing…'
                  : 'Unpublish'
                : publishPending
                  ? 'Publishing…'
                  : 'Publish'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !titleLooksValid || !slugLooksValid}
            className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-zinc-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Saving…' : mode === 'new' ? 'Create draft' : 'Save changes'}
          </button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800"
        >
          {error}
        </div>
      ) : null}
      {savedAt ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800"
        >
          Saved.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5 rounded-2xl border border-zinc-900/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={handleTitle}
              maxLength={ARTICLE_TITLE_MAX}
              placeholder="Article title"
              className="block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-serif text-2xl text-zinc-900 outline-none focus:border-zinc-400"
            />
            <span className="block text-[11px] text-zinc-500">
              {title.length}/{ARTICLE_TITLE_MAX}
            </span>
          </label>

          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Slug
            </span>
            <div className="flex items-stretch">
              <span className="inline-flex select-none items-center rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 px-3 font-mono text-[12px] text-zinc-500">
                /articles/
              </span>
              <input
                type="text"
                value={slug}
                onChange={handleSlug}
                placeholder="article-slug"
                aria-invalid={!slugLooksValid}
                className={`block flex-1 rounded-r-xl border bg-white px-3 py-2 font-mono text-[13px] outline-none ${
                  slugLooksValid ? 'border-zinc-200 focus:border-zinc-400' : 'border-red-300'
                }`}
              />
            </div>
            {!slugLooksValid ? (
              <span className="block text-[11px] text-red-700">
                Use lowercase letters, numbers, and single dashes only.
              </span>
            ) : null}
          </label>

          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Excerpt
            </span>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={ARTICLE_EXCERPT_MAX}
              rows={2}
              placeholder="One sentence summary that shows up on listings and link previews."
              className="block w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none focus:border-zinc-400"
            />
            <span className="block text-[11px] text-zinc-500">
              {excerpt.length}/{ARTICLE_EXCERPT_MAX}
            </span>
          </label>

          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Body (Markdown)
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={ARTICLE_BODY_MAX}
              rows={20}
              placeholder={'# Heading\n\nWrite the article in Markdown. **Bold**, *italic*, `code`, lists, links.'}
              className="block w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 font-mono text-[13px] leading-6 text-zinc-900 outline-none focus:border-zinc-400"
            />
            <span className="block text-[11px] text-zinc-500">
              {body.length.toLocaleString()}/{ARTICLE_BODY_MAX.toLocaleString()}
            </span>
          </label>
        </div>

        <div className="space-y-5">
          {article ? (
            <CoverImageField articleId={article.id} initialUrl={article.coverImageUrl} />
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-4 text-[12px] text-zinc-600">
              Save the draft first to upload a cover image.
            </div>
          )}

          <div className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Preview
            </div>
            {body.trim().length === 0 ? (
              <p className="text-[13px] text-zinc-500">Write something to see the rendered output.</p>
            ) : (
              <div
                className="prose prose-zinc max-w-none text-[14px] leading-7"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
