import sanitizeHtmlLib from 'sanitize-html';

// Article bodies are authored in a WYSIWYG (TipTap) and stored as HTML, then
// rendered with dangerouslySetInnerHTML — sanitize on save AND render (defense
// in depth) to a strict allowlist matching what the toolbar can produce.
// Mirrors lib/careers/sanitizeHtml.ts and lib/changelog/sanitizeHtml.ts.
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
];

export function sanitizeArticleHtml(input: string): string {
  if (!input) return '';
  return sanitizeHtmlLib(input, {
    allowedTags: [...ALLOWED_TAGS, 'a'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    // Drop any href whose scheme isn't one of these (e.g. javascript:, data:).
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { a: ['http', 'https', 'mailto'] },
    // Every surviving link opens safely in a new tab.
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' },
      }),
    },
    // Disallowed wrappers (e.g. <div>, <span>) are removed but their text is
    // kept; <script>/<style>/<textarea> are dropped with their content via the
    // library default (nonTextTags), so no allowlist entry is needed for them.
    disallowedTagsMode: 'discard',
  });
}
