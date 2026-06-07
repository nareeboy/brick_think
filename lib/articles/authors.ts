// Per-author byline configuration, keyed by lowercased email so the lookup
// survives display-name changes. Authors are supplied via the ARTICLE_AUTHORS
// environment variable (a JSON array) rather than hardcoded here, so no personal
// data lives in the repo and each deploy configures its own contributors. See
// .env.example for the shape. Unset/empty → no byline overrides (articles still
// render the author's name + avatar from their profile).
//
// Looked up server-side only (ARTICLE_AUTHORS is not NEXT_PUBLIC, so it is
// undefined in the browser → an empty map, which is harmless). Only the
// configured fields below ever leave the boundary — never the raw email.

export interface AuthorConfig {
  tagline?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

interface AuthorEntry extends AuthorConfig {
  email: string;
}

function parseAuthorLinks(): Record<string, AuthorConfig> {
  const raw = process.env.ARTICLE_AUTHORS;
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('ARTICLE_AUTHORS is not valid JSON — ignoring author byline overrides.');
    return {};
  }
  if (!Array.isArray(parsed)) {
    console.warn('ARTICLE_AUTHORS must be a JSON array — ignoring author byline overrides.');
    return {};
  }

  const map: Record<string, AuthorConfig> = {};
  for (const entry of parsed as AuthorEntry[]) {
    if (!entry || typeof entry.email !== 'string') continue;
    map[entry.email.toLowerCase()] = {
      tagline: entry.tagline,
      linkedinUrl: entry.linkedinUrl,
      portfolioUrl: entry.portfolioUrl,
    };
  }
  return map;
}

// Parsed once per process; ARTICLE_AUTHORS is read at first lookup.
let cached: Record<string, AuthorConfig> | null = null;

export function lookupAuthorConfig(email: string | null): AuthorConfig | null {
  if (!email) return null;
  cached ??= parseAuthorLinks();
  return cached[email.toLowerCase()] ?? null;
}
