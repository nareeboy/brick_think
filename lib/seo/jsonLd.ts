import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_SAME_AS, SITE_URL } from './site';

type JsonLd = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function organizationNode(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon.png'),
    description: SITE_DESCRIPTION,
    sameAs: SITE_SAME_AS,
  };
}

function websiteNode(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { '@id': ORG_ID },
  };
}

/** Site-wide Organization + WebSite graph, rendered once in the root layout. */
export function siteGraph(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationNode(), websiteNode()],
  };
}

export interface ArticleSchemaInput {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  updatedAt?: string | null;
  coverImageUrl: string | null;
  authorName: string | null;
}

/** BlogPosting structured data for an article detail page. */
export function articleSchema(article: ArticleSchemaInput): JsonLd {
  const url = absoluteUrl(`/articles/${article.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: article.title,
    ...(article.excerpt ? { description: article.excerpt } : {}),
    ...(article.coverImageUrl ? { image: [article.coverImageUrl] } : {}),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    ...(article.authorName ? { author: { '@type': 'Person', name: article.authorName } } : {}),
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
  };
}

// schema.org employmentType is an enum; map the free-text role field onto it
// and omit the property when we can't confidently classify it (an invalid
// enum value triggers Search Console warnings).
const EMPLOYMENT_TYPES: Record<string, string> = {
  'full-time': 'FULL_TIME',
  fulltime: 'FULL_TIME',
  'part-time': 'PART_TIME',
  parttime: 'PART_TIME',
  contract: 'CONTRACTOR',
  contractor: 'CONTRACTOR',
  temporary: 'TEMPORARY',
  intern: 'INTERN',
  internship: 'INTERN',
  volunteer: 'VOLUNTEER',
};

function employmentTypeEnum(raw: string): string | undefined {
  return EMPLOYMENT_TYPES[raw.trim().toLowerCase().replace(/\s+/g, '-')];
}

export interface JobPostingSchemaInput {
  slug: string;
  title: string;
  summary: string;
  descriptionHtml: string;
  location: string;
  employmentType: string;
  createdAt: string;
}

/** JobPosting structured data for an open role (Google Jobs eligibility). */
export function jobPostingSchema(role: JobPostingSchemaInput): JsonLd {
  const isRemote = /remote/i.test(role.location);
  const employmentType = employmentTypeEnum(role.employmentType);
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: role.title,
    description: role.descriptionHtml || role.summary,
    datePosted: role.createdAt,
    hiringOrganization: {
      '@type': 'Organization',
      name: SITE_NAME,
      sameAs: SITE_URL,
      logo: absoluteUrl('/icon.png'),
    },
    directApply: true,
    url: absoluteUrl(`/careers/${role.slug}`),
    ...(employmentType ? { employmentType } : {}),
    ...(isRemote
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: role.location },
        }
      : {
          jobLocation: {
            '@type': 'Place',
            address: { '@type': 'PostalAddress', addressLocality: role.location },
          },
        }),
  };
}
