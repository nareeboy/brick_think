import type { Pool } from 'pg';
import { applyUpdate, encodeStateAsUpdate, type Doc } from 'yjs';

import { projectDocToCanvas } from '@/lib/yjs/canvas-codec';

export type PersistenceLogger = (
  msg: string,
  extra?: Record<string, unknown>,
) => void;

export interface PersistenceDeps {
  pool: Pool;
  debounceMs: number;
  ceilingMs: number;
  log: PersistenceLogger;
}

export interface Persistence {
  loadDoc(modelId: string, doc: Doc): Promise<void>;
  scheduleSave(modelId: string, doc: Doc): void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

interface PendingState {
  doc: Doc;
  debounceTimer: NodeJS.Timeout | null;
  ceilingTimer: NodeJS.Timeout | null;
}

export function createPersistence(deps: PersistenceDeps): Persistence {
  const pending = new Map<string, PendingState>();

  async function persistNow(modelId: string, doc: Doc): Promise<void> {
    const state = Buffer.from(encodeStateAsUpdate(doc));
    const snapshot = projectDocToCanvas(doc);
    const client = await deps.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `insert into public.yjs_documents (name, state, updated_at)
         values ($1, $2, now())
         on conflict (name) do update
         set state = excluded.state, updated_at = excluded.updated_at`,
        [modelId, state],
      );
      await client.query(
        `update public.models
           set canvas_state = $1::jsonb,
               title = case when length(coalesce($2, '')) > 0 then $2 else title end,
               updated_at = now()
         where id = $3 and deleted_at is null`,
        [
          JSON.stringify({ groups: snapshot.groups, bricks: snapshot.bricks }),
          snapshot.title,
          modelId,
        ],
      );
      await client.query('commit');
      deps.log('persist_ok', { modelId, bytes: state.length });
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      deps.log('persist_error', { modelId, err: String(err) });
      throw err;
    } finally {
      client.release();
    }
  }

  function clearTimers(state: PendingState): void {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    if (state.ceilingTimer) clearTimeout(state.ceilingTimer);
    state.debounceTimer = null;
    state.ceilingTimer = null;
  }

  function fire(modelId: string): void {
    const state = pending.get(modelId);
    if (!state) return;
    clearTimers(state);
    pending.delete(modelId);
    void persistNow(modelId, state.doc).catch(() => undefined);
  }

  return {
    async loadDoc(modelId, doc) {
      const result = await deps.pool.query<{ state: Buffer }>(
        'select state from public.yjs_documents where name = $1',
        [modelId],
      );
      const row = result.rows[0];
      if (!row) {
        deps.log('load_empty', { modelId });
        return;
      }
      applyUpdate(doc, new Uint8Array(row.state));
      deps.log('load_ok', { modelId, bytes: row.state.length });
    },
    scheduleSave(modelId, doc) {
      const existing = pending.get(modelId);
      if (existing) {
        if (existing.debounceTimer) clearTimeout(existing.debounceTimer);
        existing.debounceTimer = setTimeout(
          () => fire(modelId),
          deps.debounceMs,
        );
        existing.doc = doc;
        return;
      }
      const state: PendingState = {
        doc,
        debounceTimer: setTimeout(() => fire(modelId), deps.debounceMs),
        ceilingTimer: setTimeout(() => fire(modelId), deps.ceilingMs),
      };
      pending.set(modelId, state);
    },
    async flush() {
      const ids = Array.from(pending.keys());
      for (const id of ids) {
        const state = pending.get(id);
        if (!state) continue;
        clearTimers(state);
        pending.delete(id);
        try {
          await persistNow(id, state.doc);
        } catch {
          /* logged inside persistNow */
        }
      }
    },
    async shutdown() {
      await this.flush();
      await deps.pool.end();
    },
  };
}
