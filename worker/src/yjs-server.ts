import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

const localEnv = join(process.cwd(), '.env.local');
if (existsSync(localEnv)) {
  loadEnv({ path: localEnv, override: false });
}

import type * as Y from 'yjs';
import { WebSocketServer, type WebSocket } from 'ws';

import { createPersistence } from './persistence';
import {
  UpgradeRejected,
  parseModelIdFromUrl,
  verifyUpgradeRequest,
} from './auth';

const requireFromHere = createRequire(import.meta.url);
const wsUtils = requireFromHere('y-websocket/bin/utils') as {
  setupWSConnection: (
    conn: WebSocket,
    request: IncomingMessage,
    options: { docName: string; gc: boolean },
  ) => void;
  docs: Map<string, Y.Doc>;
};

// Railway injects PORT for the service and routes its healthcheck to that
// port. Honour it as a fallback, but let local dev + E2E override via
// YJS_PORT so they can pin the worker to 1234 alongside Next.js on 3000.
const PORT = Number(process.env.YJS_PORT ?? process.env.PORT ?? 1234);
const HOST = process.env.YJS_HOST ?? '0.0.0.0';
const DB_URL = process.env.WORKER_DATABASE_URL ?? process.env.DATABASE_URL;
const SECRET = process.env.YJS_JWT_SECRET;
const PERSIST_DEBOUNCE_MS = Number(process.env.YJS_PERSIST_DEBOUNCE_MS ?? 5000);
const PERSIST_CEILING_MS = Number(process.env.YJS_PERSIST_CEILING_MS ?? 60_000);

function logEvent(msg: string, extra?: Record<string, unknown>): void {
  const payload = {
    ts: new Date().toISOString(),
    service: 'yjs-server',
    msg,
    ...extra,
  };
  console.warn(JSON.stringify(payload));
}

if (!SECRET) {
  logEvent('fatal', { reason: 'YJS_JWT_SECRET not set' });
  process.exit(1);
}
if (!DB_URL) {
  logEvent('fatal', { reason: 'WORKER_DATABASE_URL not set' });
  process.exit(1);
}

const pool = new Pool({ connectionString: DB_URL, max: 4 });
const persistence = createPersistence({
  pool,
  debounceMs: PERSIST_DEBOUNCE_MS,
  ceilingMs: PERSIST_CEILING_MS,
  log: logEvent,
});

const tracked = new Set<string>();

function attachPersistenceForDoc(modelId: string): void {
  if (tracked.has(modelId)) return;
  const doc = wsUtils.docs.get(modelId);
  if (!doc) return;
  tracked.add(modelId);
  void persistence
    .loadDoc(modelId, doc)
    .catch((err: unknown) =>
      logEvent('load_error', { modelId, err: String(err) }),
    );
  doc.on('update', () => {
    persistence.scheduleSave(modelId, doc);
  });
}

const httpServer = createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        service: 'yjs-server',
        status: 'ok',
        port: PORT,
        persistence: DB_URL ? 'postgres' : 'memory-only',
        rooms: Array.from(wsUtils.docs.keys()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  void (async () => {
    const modelId = parseModelIdFromUrl(request.url);
    if (!modelId) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    try {
      await verifyUpgradeRequest(request, {
        secret: SECRET,
        pool,
        expectedModelId: modelId,
      });
    } catch (err) {
      const status = err instanceof UpgradeRejected ? err.status : 500;
      const reason =
        err instanceof UpgradeRejected ? err.reason : 'internal error';
      logEvent('upgrade_rejected', {
        status,
        reason,
        modelId,
        url: request.url,
        err: err instanceof UpgradeRejected ? undefined : String(err),
      });
      socket.write(`HTTP/1.1 ${status} ${reason}\r\n\r\n`);
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, modelId);
    });
  })();
});

wss.on(
  'connection',
  (conn: WebSocket, request: IncomingMessage, modelId: string) => {
    logEvent('client_connected', { modelId });
    wsUtils.setupWSConnection(conn, request, { docName: modelId, gc: true });
    setImmediate(() => attachPersistenceForDoc(modelId));
  },
);

httpServer.listen(PORT, HOST, () => {
  logEvent('listening', { host: HOST, port: PORT });
});

async function shutdown(signal: string): Promise<void> {
  logEvent('shutdown_start', { signal });
  wss.close();
  httpServer.close();
  await persistence.shutdown();
  logEvent('shutdown_ok');
  process.exit(0);
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void shutdown(sig);
  });
}
