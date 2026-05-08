# BrickThink

A virtual Serious Play platform. See `docs/PRD.md` for the full PRD (local-only).

## Requirements

- Node 20.10 or newer
- pnpm 10
- Docker for Desktop (for the local Supabase stack)

## Local development

```sh
pnpm install
cp .env.example .env.local
# fill values in .env.local (see comments inside the file)

pnpm db:start          # boots local Supabase via Docker
pnpm exec supabase status   # prints API URL, anon key, service role key

pnpm dev               # starts Next.js on http://localhost:3000
```

Magic-link emails are caught locally by Inbucket at http://localhost:54324.

## Brick assets

```sh
pnpm bricks:placeholders          # bootstrap assets/bricks-raw/
pnpm bricks:placeholders --force  # overwrite existing placeholders
pnpm bricks:ingest                # rebuild public/bricks/ + manifest.json
```

## Quality and testing

```sh
pnpm lint
pnpm typecheck
pnpm test            # vitest unit tests
pnpm test:e2e        # playwright auth + smoke specs (excludes the canvas bench)
pnpm bench:canvas    # runs the canvas benchmark and writes results to docs/decisions/
```

## Database scripts

```sh
pnpm db:start    # supabase start
pnpm db:stop     # supabase stop
pnpm db:reset    # reapply all migrations and seed
pnpm db:status
pnpm db:diff     # generate a migration from local changes
pnpm db:types    # regenerate lib/db/types.generated.ts
```

## Status

Phase 0 in progress. See [docs/PHASE_0_REPORT.md](docs/PHASE_0_REPORT.md) once complete.
