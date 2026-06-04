import { describe, expect, test } from 'vitest';

import { sanitizeRoleHtml } from '@/lib/careers/sanitizeHtml';

describe('sanitizeRoleHtml', () => {
  test('drops <script> tags and their content', () => {
    const out = sanitizeRoleHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('<p>hi</p>');
  });

  test('drops <style> tags and their content', () => {
    const out = sanitizeRoleHtml('<style>body{display:none}</style>visible');
    expect(out).not.toContain('display');
    expect(out).toContain('visible');
  });

  test('strips event-handler attributes', () => {
    const out = sanitizeRoleHtml('<p onclick="steal()">hi</p>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('hi');
  });

  test('removes javascript: links (no dangerous href survives)', () => {
    const out = sanitizeRoleHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('alert');
  });

  test('keeps http(s) links and forces safe rel/target', () => {
    const out = sanitizeRoleHtml('<a href="https://brickthink.io">site</a>');
    expect(out).toContain('href="https://brickthink.io"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('>site</a>');
  });

  test('allows mailto links', () => {
    const out = sanitizeRoleHtml('<a href="mailto:jobs@brickthink.io">mail</a>');
    expect(out).toContain('href="mailto:jobs@brickthink.io"');
  });

  test('preserves the allowed formatting set', () => {
    const input =
      '<h2>Heading</h2><p><strong>bold</strong> <em>italic</em></p>' +
      '<ul><li>one</li></ul><ol><li>1</li></ol><blockquote>q</blockquote><code>c</code>';
    const out = sanitizeRoleHtml(input);
    for (const frag of [
      '<h2>Heading</h2>',
      '<strong>bold</strong>',
      '<em>italic</em>',
      '<ul><li>one</li></ul>',
      '<ol><li>1</li></ol>',
      '<blockquote>q</blockquote>',
      '<code>c</code>',
    ]) {
      expect(out).toContain(frag);
    }
  });

  test('strips disallowed embedding tags entirely', () => {
    expect(sanitizeRoleHtml('<img src=x onerror=alert(1)>')).not.toContain('img');
    expect(sanitizeRoleHtml('<iframe src="//evil"></iframe>')).not.toContain('iframe');
    // a disallowed wrapper is unwrapped but its text is kept
    expect(sanitizeRoleHtml('<div>kept</div>')).toContain('kept');
  });

  test('returns empty string for empty/whitespace input', () => {
    expect(sanitizeRoleHtml('')).toBe('');
  });

  // Adversarial regression guards for the load-bearing allowlist / schemes /
  // transformTags config. These pass today; the point is to fail loudly if a
  // future edit to sanitizeHtml.ts weakens the gate.
  describe('adversarial regression guards', () => {
    test.each([
      '<a href="java&#115;cript:alert(1)">x</a>',
      '<a href="java\tscript:alert(1)">x</a>',
      '<a href="  javascript:alert(1)">x</a>',
      '<a href="JavaScript:alert(1)">x</a>',
      '<a href="vbscript:msgbox(1)">x</a>',
      '<a href="data:text/html,<script>alert(1)</script>">x</a>',
    ])('neutralizes dangerous href: %s', (payload) => {
      const out = sanitizeRoleHtml(payload).toLowerCase();
      expect(out).not.toContain('javascript:');
      expect(out).not.toContain('vbscript:');
      expect(out).not.toContain('data:text/html');
      expect(out).not.toContain('alert');
    });

    test.each([
      '<svg onload="alert(1)"></svg>',
      '<form action="/x"></form>',
      '<object data="x"></object>',
      '<embed src="x">',
    ])('strips dangerous element: %s', (payload) => {
      const out = sanitizeRoleHtml(payload).toLowerCase();
      for (const bad of ['svg', 'onload', 'form', 'object', 'embed', 'alert']) {
        expect(out).not.toContain(bad);
      }
    });

    test('does not re-introduce event handlers on allowed links', () => {
      const out = sanitizeRoleHtml('<a href="https://x.io" onmouseover="alert(1)">x</a>');
      expect(out).not.toContain('onmouseover');
      expect(out).not.toContain('alert');
      expect(out).toContain('href="https://x.io"');
    });

    test('entity-encoded markup stays inert text (no real tags)', () => {
      const out = sanitizeRoleHtml('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(out).not.toContain('<script');
    });
  });
});
