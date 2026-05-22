import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('escapes raw HTML', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toContain(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });
  it('renders headings', () => {
    expect(renderMarkdown('# Title\n\n## Sub')).toBe('<h1>Title</h1>\n<h2>Sub</h2>');
  });
  it('wraps paragraphs', () => {
    expect(renderMarkdown('Hello world')).toBe('<p>Hello world</p>');
  });
  it('renders unordered lists', () => {
    const html = renderMarkdown('- one\n- two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
    expect(html).toContain('</ul>');
  });
  it('renders bold and italic', () => {
    expect(renderMarkdown('**bold** and *italic*')).toContain('<strong>bold</strong>');
    expect(renderMarkdown('**bold** and *italic*')).toContain('<em>italic</em>');
  });
  it('renders inline code', () => {
    expect(renderMarkdown('hello `world`')).toContain('<code>world</code>');
  });
  it('renders fenced code blocks with escaped content', () => {
    expect(renderMarkdown('```\n<x>\n```')).toContain('<pre><code>&lt;x&gt;</code></pre>');
  });
  it('refuses non-http(s) links — no <a> tag is produced', () => {
    const html = renderMarkdown('[x](javascript:alert(1))');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href=');
  });
  it('renders http(s) links', () => {
    const html = renderMarkdown('[BT](https://brickthink.io)');
    expect(html).toContain('<a href="https://brickthink.io"');
    expect(html).toContain('>BT</a>');
  });
});
