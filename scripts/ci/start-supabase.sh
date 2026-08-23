#!/usr/bin/env bash
# Boot the trimmed local Supabase stack for CI, retrying the one failure we
# know to be environmental.
#
# Hosted ubuntu-latest runners intermittently fail `supabase start` with
#   failed to bind host port for 0.0.0.0:54322:…:5432/tcp: address already in use
# before a single test runs; a plain rerun of the job passes. We still do not
# know what holds 54322, so before EVERY attempt this prints the current
# listeners on the port (keep that even when the first attempt succeeds — the
# next occurrence is what tells us the culprit).
#
# Only that bind-failure signature is retried. Any other non-zero exit (a
# migration error, a bad config, a pull failure) is surfaced immediately so a
# genuine failure is never retried into the noise.
#
# Used by all three stack boots in .github/workflows/ci.yml (the integration
# job in the foreground, the two E2E shards under nohup). The exclusion list
# is deliberately identical across them — see the per-step comments there and
# docs/infra/ci-e2e-performance.md for why each container is dropped.
set -euo pipefail

EXCLUDE='studio,postgres-meta,imgproxy,edge-runtime,logflare,vector,supavisor'
PORT="${SUPABASE_DB_PORT:-54322}"
MAX_ATTEMPTS=3
# Seconds to wait before attempt 2 and attempt 3 respectively.
BACKOFFS=(10 20)
BIND_FAILURE_RE='failed to bind host port|address already in use'

LOG_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
LOG_PREFIX="${LOG_DIR%/}/supabase-start-attempt"

print_port_holders() {
  echo "--- who holds :${PORT} (attempt ${1}/${MAX_ATTEMPTS}) ---"
  if command -v ss >/dev/null 2>&1; then
    # Process names for sockets owned by other users need root; the hosted
    # runner has passwordless sudo, fall back to the unprivileged view.
    if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
      sudo -n ss -ltnp "sport = :${PORT}" || true
    else
      ss -ltnp "sport = :${PORT}" || true
    fi
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN || true
  else
    echo "(neither ss nor lsof available)"
  fi
  if command -v docker >/dev/null 2>&1; then
    docker ps --filter "publish=${PORT}" || true
  fi
  echo "--- end port check ---"
}

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  print_port_holders "${attempt}"

  attempt_log="${LOG_PREFIX}-${attempt}.log"
  echo "supabase start: attempt ${attempt}/${MAX_ATTEMPTS}"
  rc=0
  # Stream to stdout so the surrounding step/log sees the live output, and keep
  # a per-attempt copy for the signature check. pipefail makes $? the exit
  # code of `supabase start`, not of tee.
  if supabase start -x "${EXCLUDE}" 2>&1 | tee "${attempt_log}"; then
    echo "supabase start: succeeded on attempt ${attempt}/${MAX_ATTEMPTS}"
    exit 0
  else
    rc=$?
  fi

  if ! grep -qE "${BIND_FAILURE_RE}" "${attempt_log}"; then
    echo "::error::supabase start failed (exit ${rc}) without the port-bind signature — not retrying"
    exit "${rc}"
  fi

  if [ "${attempt}" -ge "${MAX_ATTEMPTS}" ]; then
    echo "::error::supabase start failed ${MAX_ATTEMPTS} times on the port-${PORT} bind; giving up. Last log:"
    cat "${attempt_log}"
    exit "${rc}"
  fi

  backoff="${BACKOFFS[$((attempt - 1))]}"
  echo "::warning::supabase start hit the port-${PORT} bind collision on attempt ${attempt}/${MAX_ATTEMPTS}; tearing down and retrying in ${backoff}s"
  # Half-created containers keep the endpoint; tear them down so the retry is
  # not guaranteed to hit the same thing. Best-effort: there may be nothing
  # to stop.
  supabase stop --no-backup || true
  sleep "${backoff}"
done

# Unreachable — every loop path exits — but keep the script honest under set -e.
exit 1
