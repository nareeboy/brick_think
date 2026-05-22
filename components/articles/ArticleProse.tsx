import { renderMarkdown } from '@/lib/articles/markdown';

interface Props {
  markdown: string;
}

// Editorial prose container for the public article reader.
// Typography decisions are baked into one place so the markdown output across
// every article matches the BrickThink marketing voice — Fraunces upright on
// headings and blockquotes (no italic flourishes per the project's display-type
// rule), Geist for body, generous leading, 65ch measure, brand-coloured links.
export function ArticleProse({ markdown }: Props) {
  const html = renderMarkdown(markdown);
  return (
    <div
      className="article-prose text-[17px] leading-[1.75] text-zinc-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
