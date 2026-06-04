import sanitizeHtmlLib from 'sanitize-html';

// The role description is authored in a WYSIWYG (TipTap) and stored as HTML,
// then rendered on the public /careers page with dangerouslySetInnerHTML — the
// classic stored-XSS surface. Even though only site admins author it, we
// sanitize on save (defense in depth) to a strict allowlist that matches what
// the editor's toolbar can produce. Anything outside the allowlist is removed;
// <script>/<style> are dropped tag AND content (sanitize-html's nonTextTags).

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

export function sanitizeRoleHtml(input: string): string {
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
