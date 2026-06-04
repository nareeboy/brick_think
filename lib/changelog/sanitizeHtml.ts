// lib/changelog/sanitizeHtml.ts
import sanitizeHtmlLib from 'sanitize-html';

// Strict allow-list matching what the TipTap toolbar can emit. <script>/<style>
// are dropped tag AND content via the library's nonTextTags default. Authored
// by site admins only, but sanitized regardless — stored-XSS defense in depth.
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

export function sanitizeChangelogHtml(input: string): string {
  if (!input) return '';
  return sanitizeHtmlLib(input, {
    allowedTags: [...ALLOWED_TAGS, 'a'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { a: ['http', 'https', 'mailto'] },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' },
      }),
    },
    disallowedTagsMode: 'discard',
  });
}
