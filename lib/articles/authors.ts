// Per-author byline configuration. Keyed by lowercased email so the lookup
// survives display-name changes. Looked up server-side via service role (only
// the configured fields here ever leave the boundary — never the raw email).
// When a new contributor lands, add their email + links here; nothing else
// needs to change to make the byline pick them up.

export interface AuthorConfig {
  tagline?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

export const AUTHOR_LINKS: Readonly<Record<string, AuthorConfig>> = {
  'naresh.shan@googlemail.com': {
    tagline: 'Building BrickThink, in the open.',
    linkedinUrl: 'https://www.linkedin.com/in/naresh-shan/',
    portfolioUrl: 'https://www.naresh-shan.com/',
  },
};

export function lookupAuthorConfig(email: string | null): AuthorConfig | null {
  if (!email) return null;
  return AUTHOR_LINKS[email.toLowerCase()] ?? null;
}
