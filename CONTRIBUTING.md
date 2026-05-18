# Contributing to BrickThink

Thanks for your interest in contributing. This guide covers what you need to get a local dev environment running, the checks we expect to pass before you open a PR, and the conventions we use for commits and branches.

The hosted instance lives at [https://www.brickthink.io](https://www.brickthink.io). The README has the full operational reference; this document is the contributor-focused subset.

## Prerequisites

- **Node** 20.10 or newer
- **pnpm** 10 or newer (`corepack enable` then `corepack prepare pnpm@latest --activate`)
- **Docker for Desktop** (or OrbStack) — required for the local Supabase stack

The Supabase CLI is bundled as a dev dependency, so you do not need a global install.

## First-time setup

```bash
git clone https://github.com/<your-fork>/brick_think.git
cd brick_think

pnpm install
cp .env.example .env.local         # fill in the values commented inline

pnpm db:start                       # boots local Supabase via Docker
pnpm db:status                      # confirms all services are healthy

pnpm dev:e2e                        # http://localhost:3000 → LOCAL Supabase
```

`pnpm dev:e2e` points the app at the local Supabase stack, so magic-link emails land in Mailpit at `http://127.0.0.1:54324` and there are no rate limits. Use this for everyday development.

`pnpm dev` (without `:e2e`) points at a *remote* Supabase project configured in `.env.local`. You only need it if you're reproducing something against production-shaped data.

### Yjs collaboration worker

If you're touching live collaboration (the `shared_model` stage, presence, the Yjs binding, the WebSocket worker), run the worker in a second terminal:

```bash
pnpm worker:dev
```

It reads `.env.local` on boot. For local dev, `WORKER_DATABASE_URL` must point at local Postgres (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`) — the README's *Worker* section has the convention for toggling between local and remote.

## Pre-PR checks

Run these locally before pushing. CI runs the same set and will block the PR if any of them fail.

```bash
pnpm format:check     # prettier — no formatting drift
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest unit tests
```

If your change touches anything user-visible, also run the E2E suite:

```bash
pnpm build:e2e        # production build against local Supabase
pnpm test:e2e         # Playwright; see e2e/CLAUDE.md for fixtures and gotchas
```

For UI changes, start the dev server and exercise the feature in a real browser — typecheck and tests verify code correctness, not feature correctness.

## Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/) and keep one logical unit per commit. Recent history is the style guide; a few examples from `git log`:

```
feat(yjs): publish selectedBrickId via awareness
fix(account): raise avatar size cap to 512 KB and log rejection reasons
refactor(builder): extract autosave into useAutosave hook
docs(avatar): document the profile-avatar system and public-bucket gotchas
```

- Keep the subject under ~72 characters.
- Write the body to explain *why*, not *what* — the diff already shows the what.
- Never bypass git hooks (`--no-verify`) unless a maintainer explicitly asks you to.

## Branches and pull requests

- Work on a feature branch off `main`. Push your branch to your fork and open a PR against `nareeboy/brick_think:main`.
- Never push directly to `main` — even maintainers go through PRs.
- Rebase on top of `main` before requesting review if your branch has drifted significantly. We prefer a linear history.
- One PR per logical change. If you find yourself writing "this PR does A and also B," split it.

PR descriptions should cover:

- What changed and why.
- Anything reviewers should pay particular attention to (a subtle invariant, a perf-sensitive path, a new RLS policy).
- How you tested it — the commands you ran, the manual steps you took.

## Schema and database changes

Migrations live in `supabase/migrations/` and are applied in timestamp order. When authoring one:

1. Make the schema change in local Supabase (Studio → SQL editor, or by editing seed data and running `pnpm db:reset`).
2. `pnpm db:diff` writes a new migration file with the delta.
3. Regenerate types with `pnpm db:types`.
4. Commit the migration file *and* the regenerated `lib/db/types.generated.ts` together.

Maintainers apply migrations to the hosted database via `pnpm db:push`; this is never done autonomously and never as part of a PR merge.

## Documentation policy

Local notes, specs, and brainstorming output go in `docs/`, which is gitignored. Do not commit anything inside `docs/`. The only Markdown that belongs in the repo is what's at the root (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, NOTICE, LICENSE) and the `CLAUDE.md` files that live next to the code they describe.

## Reporting security issues

Please **do not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the disclosure process.

## Code of Conduct

By participating in this project you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). Reports go to **security@brickthink.io**.

## Licensing of your contributions

BrickThink is licensed under the [Apache License 2.0](LICENSE). By submitting a contribution (a pull request, a patch, or any other change), you agree that your contribution is licensed under the same terms — inbound contributions match the outbound licence. You retain copyright in your contribution; the licence simply grants the project (and its users) the rights described in the Apache 2.0 text.
