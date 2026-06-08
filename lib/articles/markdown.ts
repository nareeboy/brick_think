// Minimal, dependency-free markdown subset used by the admin preview and the
// future public reader. Supports: ATX headings (# … ######), unordered lists
// (-, *), ordered lists (1.), blockquotes (>), fenced code blocks (```), inline
// code (`x`), bold (**x**), italic (*x* and _x_), links ([text](url)), and
// paragraph wrapping. Everything else falls through as escaped text — so this
// is intentionally safe to render with dangerouslySetInnerHTML on trusted
// admin-authored content. Anything richer (images, tables) is a follow-up.

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

function renderInline(line: string): string {
  let s = escapeHtml(line);
  // inline code first so its contents are not further transformed
  s = s.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
  // bold (greedy minimum)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic — *...* but not part of an already-consumed **
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  // links — [text](https?://...) only, refuse javascript: etc.
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label: string, href: string) => {
    return `<a href="${href}" rel="noopener noreferrer" target="_blank">${label}</a>`;
  });
  return s;
}

export function renderMarkdown(input: string): string {
  if (!input) return '';
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let i = 0;
  let listKind: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listKind) {
      out.push(`</${listKind}>`);
      listKind = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Fenced code block
    if (trimmed.startsWith('```')) {
      flushParagraph();
      closeList();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      i++; // consume closing fence
      out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Blank line
    if (trimmed === '') {
      flushParagraph();
      closeList();
      i++;
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1]?.length ?? 1;
      out.push(`<h${level}>${renderInline(heading[2] ?? '')}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote (single-level)
    if (trimmed.startsWith('> ')) {
      flushParagraph();
      closeList();
      const bqLines: string[] = [];
      while (i < lines.length) {
        const t = (lines[i] ?? '').trim();
        if (!t.startsWith('> ')) break;
        bqLines.push(t.slice(2));
        i++;
      }
      out.push(`<blockquote>${renderInline(bqLines.join(' '))}</blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (ulMatch) {
      flushParagraph();
      if (listKind !== 'ul') {
        closeList();
        out.push('<ul>');
        listKind = 'ul';
      }
      out.push(`<li>${renderInline(ulMatch[1] ?? '')}</li>`);
      i++;
      continue;
    }

    // Ordered list
    const olMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (olMatch) {
      flushParagraph();
      if (listKind !== 'ol') {
        closeList();
        out.push('<ol>');
        listKind = 'ol';
      }
      out.push(`<li>${renderInline(olMatch[1] ?? '')}</li>`);
      i++;
      continue;
    }

    // Otherwise — paragraph text
    closeList();
    paragraph.push(trimmed);
    i++;
  }

  flushParagraph();
  closeList();

  return out.join('\n');
}

// Article bodies support only h2/h3 headings (the WYSIWYG toolbar's range; the
// article's sole h1 is the page title). Map legacy Markdown headings into that
// range so sanitizeArticleHtml (which allows only h2/h3) never strips a heading
// down to a bare text node: h1 -> h2, h4/h5/h6 -> h3. h2/h3 pass through.
export function renderArticleMarkdown(markdown: string): string {
  return renderMarkdown(markdown)
    .replace(/<(\/?)h1>/g, '<$1h2>')
    .replace(/<(\/?)h[456]>/g, '<$1h3>');
}
