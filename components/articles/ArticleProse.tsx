import { renderArticleMarkdown } from '@/lib/articles/markdown';
import { sanitizeArticleHtml } from '@/lib/articles/sanitizeHtml';

interface Props {
  html: string;
}

// Editorial prose container for the public article reader. Bodies are stored as
// sanitized HTML (authored via the WYSIWYG editor). TRANSITIONAL: rows not yet
// migrated by scripts/convert-article-bodies-to-html.ts still hold Markdown —
// HTML bodies start with a tag, Markdown does not — so fall back to
// renderArticleMarkdown for those (same heading-range mapping the conversion
// script uses, so pre- and post-conversion rows render identically). Remove this
// fallback (and lib/articles/markdown.ts) once every environment is converted.
//
// Typography decisions are baked into one place so the rendered output across
// every article matches the BrickThink marketing voice — Fraunces upright on
// headings and blockquotes (no italic flourishes per the project's display-type
// rule), Geist for body, generous leading, 65ch measure, brand-coloured links.
export function ArticleProse({ html }: Props) {
  const rendered = html.trimStart().startsWith('<')
    ? sanitizeArticleHtml(html)
    : sanitizeArticleHtml(renderArticleMarkdown(html));
  return (
    <div
      className="article-prose text-[17px] leading-[1.75] text-zinc-800"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
