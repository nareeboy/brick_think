import { describe, expect, it } from 'vitest';
import { sanitizeArticleHtml } from './sanitizeHtml';

describe('sanitizeArticleHtml', () => {
  it('keeps allowed formatting tags', () => {
    const html =
      '<p><strong>Bold</strong> and <em>italic</em></p><h2>Heading</h2><ul><li>One</li></ul>';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it('strips <script> tag and its content', () => {
    expect(sanitizeArticleHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
  });

  it('strips event-handler attributes', () => {
    expect(sanitizeArticleHtml('<p onclick="evil()">hi</p>')).toBe('<p>hi</p>');
  });

  it('drops javascript: links but keeps the text', () => {
    // sanitize-html strips the disallowed scheme from href but keeps the <a>
    // wrapper (the transform still fires); the surviving tag has no href.
    expect(sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a rel="noopener noreferrer" target="_blank">x</a>',
    );
  });

  it('forces rel/target on surviving links', () => {
    // sanitize-html emits rel before target in its attribute serialisation.
    expect(sanitizeArticleHtml('<a href="https://x.com">x</a>')).toBe(
      '<a href="https://x.com" rel="noopener noreferrer" target="_blank">x</a>',
    );
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeArticleHtml('')).toBe('');
  });
});
