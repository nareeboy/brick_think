// Spawn the Yjs worker as a child process for integration tests. The worker
// holds in-process Y.Doc state, so reusing the production-style boot via
// `pnpm exec tsx worker/src/yjs-server.ts` keeps the test path realistic
// without recreating the upgrade-handler wiring in tests.

import { spawn, type ChildProcess } from 'node:child_process';

let proc: ChildProcess | null = null;

export async function startWorker(opts: {
  port: number;
  secret: string;
}): Promise<void> {
  if (proc) throw new Error('worker already running');
  const dbUrl =
    process.env.WORKER_DATABASE_URL ??
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  proc = spawn(
    'pnpm',
    ['exec', 'tsx', 'worker/src/yjs-server.ts'],
    {
      env: {
        ...process.env,
        YJS_PORT: String(opts.port),
        YJS_JWT_SECRET: opts.secret,
        WORKER_DATABASE_URL: dbUrl,
        YJS_PERSIST_DEBOUNCE_MS: '300',
        YJS_PERSIST_CEILING_MS: '3000',
      },
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  );
  const start = Date.now();
  while (Date.now() - start < 15_000) {
    try {
      const res = await fetch(`http://localhost:${opts.port}/healthz`);
      if (res.ok) return;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('worker did not start within 15s');
}

export async function stopWorker(): Promise<void> {
  if (!proc) return;
  const child = proc;
  proc = null;
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
