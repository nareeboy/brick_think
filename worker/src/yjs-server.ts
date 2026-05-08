import { createServer, type IncomingMessage } from 'node:http';
import { createRequire } from 'node:module';

import { Pool } from 'pg';
import * as Y from 'yjs';
import { WebSocketServer, type WebSocket } from 'ws';

// y-websocket bin/utils is CommonJS; load it with createRequire so the
// "type: module" Node project can still pull in its server helpers.
const requireFromHere = createRequire(import.meta.url);
const wsUtils = requireFromHere('y-websocket/bin/utils') as {
  setupWSConnection: (
    conn: WebSocket,
    request: IncomingMessage,
    options: { docName: string; gc: boolean },
  ) => void;
  docs: Map<string, Y.Doc>;
};

const PORT = Number(process.env.YJS_PORT ?? 1234);
const HOST = process.env.YJS_HOST ?? '0.0.0.0';
const DB_URL = process.env.WORKER_DATABASE_URL ?? process.env.DATABASE_URL;
const PERSIST_DEBOUNCE_MS = Number(process.env.YJS_PERSIST_DEBOUNCE_MS ?? 5000);

interface RoomPersistence {
  loadDoc(name: string, doc: Y.Doc): Promise<void>;
  scheduleSave(name: string, doc: Y.Doc): void;
  flush(): Promise<void>;
}

function logEvent(msg: string, extra?: Record<string, unknown>): void {
  const payload = { ts: new Date().toISOString(), service: 'yjs-server', msg, ...extra };
  console.warn(JSON.stringify(payload));
}

function createPersistence(): RoomPersistence | null {
  if (!DB_URL) {
    logEvent('persistence_disabled', { reason: 'WORKER_DATABASE_URL not set' });
    return null;
  }

  const pool = new Pool({ connectionString: DB_URL, max: 4 });
  const pendingTimers = new Map<string, NodeJS.Timeout>();
  const pendingDocs = new Map<string, Y.Doc>();

  async function persist(name: string, doc: Y.Doc): Promise<void> {
    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    await pool.query(
      `insert into public.yjs_documents (name, state, updated_at)
       values ($1, $2, now())
       on conflict (name) do update
       set state = excluded.state,
           updated_at = excluded.updated_at`,
      [name, state],
    );
    logEvent('persist_ok', { name, bytes: state.length });
  }

  return {
    async loadDoc(name, doc) {
      const result = await pool.query<{ state: Buffer }>(
        'select state from public.yjs_documents where name = $1',
        [name],
      );
      const row = result.rows[0];
      if (!row) {
        logEvent('load_empty', { name });
        return;
      }
      Y.applyUpdate(doc, new Uint8Array(row.state));
      logEvent('load_ok', { name, bytes: row.state.length });
    },
    scheduleSave(name, doc) {
      pendingDocs.set(name, doc);
      const existing = pendingTimers.get(name);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        pendingTimers.delete(name);
        const target = pendingDocs.get(name);
        if (!target) return;
        pendingDocs.delete(name);
        void persist(name, target).catch((err: unknown) =>
          logEvent('persist_error', { name, err: String(err) }),
        );
      }, PERSIST_DEBOUNCE_MS);
      pendingTimers.set(name, timer);
    },
    async flush() {
      for (const [name, timer] of pendingTimers) {
        clearTimeout(timer);
        const doc = pendingDocs.get(name);
        if (doc) await persist(name, doc).catch(() => undefined);
      }
      pendingTimers.clear();
      pendingDocs.clear();
      await pool.end();
    },
  };
}

const persistence = createPersistence();
const trackedDocs = new Set<string>();

function attachPersistenceForDoc(name: string): void {
  if (!persistence || trackedDocs.has(name)) return;
  const doc = wsUtils.docs.get(name);
  if (!doc) return;
  trackedDocs.add(name);
  void persistence
    .loadDoc(name, doc)
    .catch((err: unknown) => logEvent('load_error', { name, err: String(err) }));
  doc.on('update', () => {
    persistence.scheduleSave(name, doc);
  });
}

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      service: 'yjs-server',
      status: 'ok',
      port: PORT,
      persistence: DB_URL ? 'postgres' : 'memory-only',
      rooms: Array.from(wsUtils.docs.keys()),
    }),
  );
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  if (!request.url || !request.url.startsWith('/yjs/')) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (conn: WebSocket, request: IncomingMessage) => {
  const url = request.url ?? '/yjs/anonymous';
  const path = url.replace(/^\/yjs\//, '').split('?')[0] ?? 'anonymous';
  const docName = decodeURIComponent(path) || 'anonymous';

  logEvent('client_connected', { docName });
  wsUtils.setupWSConnection(conn, request, { docName, gc: true });
  // setupWSConnection materialises the Y.Doc synchronously, so it is safe
  // to attach persistence on the next tick.
  setImmediate(() => attachPersistenceForDoc(docName));
});

httpServer.listen(PORT, HOST, () => {
  logEvent('listening', { host: HOST, port: PORT });
});

async function shutdown(signal: string): Promise<void> {
  logEvent('shutdown_start', { signal });
  wss.close();
  httpServer.close();
  if (persistence) await persistence.flush();
  logEvent('shutdown_ok');
  process.exit(0);
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void shutdown(sig);
  });
}
