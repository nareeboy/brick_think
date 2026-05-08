# BrickThink

A virtual Serious Play platform. See `docs/PRD.md` for the full PRD (local-only).

## Requirements

- Node 20.10 or newer
- pnpm 10
- Supabase CLI (added in step 3)

## Local development

```sh
pnpm install
cp .env.example .env.local
# fill values in .env.local
```

Quality scripts:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

## Status

Phase 0 in progress. See [docs/PHASE_0_REPORT.md](docs/PHASE_0_REPORT.md) once complete.
