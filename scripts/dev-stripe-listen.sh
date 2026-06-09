#!/usr/bin/env sh
# Forwards Stripe TEST webhooks to the local dev server (port 3000) so billing
# events (subscribe / cancel / resume) reach /api/stripe/webhook during
# `pnpm dev:e2e`. Reads the test key from .env.local (the only place it lives).
#
# Resilient by design: no-ops quietly when the Stripe CLI isn't installed or no
# key is set, and always ends on `tail -f` so that — under `concurrently -k` —
# a missing/expired Stripe setup can never tear down the web + yjs processes.
#
# Note: `stripe listen` uses a stable per-device signing secret. It must match
# STRIPE_WEBHOOK_SECRET in .env.local; if listen prints a different whsec_,
# update .env.local and restart.

KEY=$(grep -E '^STRIPE_SECRET_KEY=' .env.local 2>/dev/null | cut -d= -f2-)

if command -v stripe >/dev/null 2>&1 && [ -n "$KEY" ]; then
  stripe listen --api-key "$KEY" --forward-to localhost:3000/api/stripe/webhook ||
    echo "[stripe] listen exited — check STRIPE_SECRET_KEY / stripe auth, then restart dev:e2e"
else
  echo "[stripe] skipped — Stripe CLI not installed or STRIPE_SECRET_KEY missing in .env.local"
fi

exec tail -f /dev/null
