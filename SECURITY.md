# Security Policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in BrickThink, **please do not open a public GitHub issue**. Public issues are visible to everyone before we have a chance to fix the problem.

Instead, email **security@brickthink.io** with:

- A description of the vulnerability and what an attacker can do with it.
- Steps to reproduce — ideally a minimal test case or proof-of-concept.
- The affected version, commit SHA, or URL where you observed the issue.
- Your name and any preferred attribution if you'd like to be credited.

We will acknowledge your report within **5 business days** and aim to ship a fix or mitigation within **30 days** for high-severity issues. We'll keep you in the loop while we investigate.

## Scope

**In scope:**

- The hosted application at `www.brickthink.io` and any subdomain.
- The code in this repository — the Next.js web app, the Yjs collaboration worker (`worker/`), and the Supabase migration set (`supabase/migrations/`).
- The default deployment configuration (`railway.toml`, `worker/railway.toml`).

**Out of scope** (please don't report these):

- Vulnerabilities in third-party services we depend on (Supabase, Stripe, Resend, Railway, Google OAuth). Report those directly to the vendor.
- Issues that require a malicious admin or owner role inside your *own* organisation.
- Missing rate limits on dev-only endpoints under `/api/test/*` — these are gated by a localhost host check plus an env flag and are never enabled in production.
- Findings that depend on outdated or compromised browsers, devices, or networks.
- Social-engineering or physical-access scenarios.

## Coordinated disclosure

We follow responsible disclosure. Please give us a reasonable window to investigate and ship a fix before publishing details. Once a fix is released, we're happy to credit you in the release notes (or to keep the disclosure anonymous — your call).
