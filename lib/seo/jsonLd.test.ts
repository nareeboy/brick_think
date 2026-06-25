import { describe, expect, it } from 'vitest';

import { articleSchema, jobPostingSchema, siteGraph } from './jsonLd';
import { SITE_URL } from './site';

describe('siteGraph', () => {
  const graph = siteGraph();
  const nodes = graph['@graph'] as Array<Record<string, unknown>>;

  it('emits Organization and WebSite nodes under one @context', () => {
    expect(graph['@context']).toBe('https://schema.org');
    expect(nodes.map((n) => n['@type'])).toEqual(['Organization', 'WebSite']);
  });

  it('links the WebSite publisher to the Organization @id', () => {
    const [org, website] = nodes as [Record<string, unknown>, Record<string, unknown>];
    expect(website.publisher).toEqual({ '@id': org['@id'] });
  });
});

describe('articleSchema', () => {
  const base = {
    slug: 'remote-lsp',
    title: 'Remote LSP',
    excerpt: 'How it works',
    publishedAt: '2026-01-02T00:00:00.000Z',
    coverImageUrl: 'https://img.example/cover.png',
    authorName: 'Ada',
  };

  it('builds a BlogPosting with absolute canonical url', () => {
    const s = articleSchema(base);
    expect(s['@type']).toBe('BlogPosting');
    expect(s.url).toBe(`${SITE_URL}/articles/remote-lsp`);
    expect(s.author).toEqual({ '@type': 'Person', name: 'Ada' });
    expect(s.image).toEqual(['https://img.example/cover.png']);
  });

  it('falls back dateModified to publishedAt and omits optional fields', () => {
    const s = articleSchema({
      ...base,
      excerpt: null,
      coverImageUrl: null,
      authorName: null,
      updatedAt: null,
    });
    expect(s.dateModified).toBe(base.publishedAt);
    expect(s.description).toBeUndefined();
    expect(s.image).toBeUndefined();
    expect(s.author).toBeUndefined();
  });
});

describe('jobPostingSchema', () => {
  const base = {
    slug: 'staff-eng',
    title: 'Staff Engineer',
    summary: 'Build things',
    descriptionHtml: '<p>Build things</p>',
    location: 'Zurich, Switzerland',
    employmentType: 'Full-time',
    createdAt: '2026-03-01T00:00:00.000Z',
  };

  it('maps employmentType free-text onto the schema enum', () => {
    expect(jobPostingSchema(base).employmentType).toBe('FULL_TIME');
    expect(jobPostingSchema({ ...base, employmentType: 'Contract' }).employmentType).toBe(
      'CONTRACTOR',
    );
  });

  it('omits employmentType when unclassifiable', () => {
    expect(
      jobPostingSchema({ ...base, employmentType: 'Seasonal-ish' }).employmentType,
    ).toBeUndefined();
  });

  it('uses a physical jobLocation for on-site roles', () => {
    const s = jobPostingSchema(base);
    expect(s.jobLocationType).toBeUndefined();
    expect((s.jobLocation as Record<string, unknown>)['@type']).toBe('Place');
  });

  it('marks remote roles TELECOMMUTE', () => {
    const s = jobPostingSchema({ ...base, location: 'Remote (EU)' });
    expect(s.jobLocationType).toBe('TELECOMMUTE');
    expect(s.jobLocation).toBeUndefined();
  });
});
