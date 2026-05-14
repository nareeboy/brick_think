'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createShareLink,
  revokeShareLink,
} from '@/app/(authed)/app/designs/[id]/share-actions';
import type { ShareTtl } from '@/lib/share/ttl';

interface ShareLinkRow {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
}

const TTL_OPTIONS: { value: ShareTtl; label: string }[] = [
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'never', label: 'Never' },
];

function formatExpiry(expiresAt: string | null): string {
  if (expiresAt === null) return 'Never expires';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `Expires in ${days}d ${hours}h`;
  if (hours > 0) return `Expires in ${hours}h`;
  return 'Expires in <1h';
}

function buildUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/share/${token}`;
}

export function ShareModal({
  modelId,
  open,
  onClose,
}: {
  modelId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [ttl, setTtl] = useState<ShareTtl>('7d');
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/models/${modelId}/share-links`);
    if (!res.ok) return;
    const data = (await res.json()) as { links: ShareLinkRow[] };
    setLinks(data.links);
  }, [modelId]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const copy = useCallback(async (token: string, id: string) => {
    await navigator.clipboard.writeText(buildUrl(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  }, []);

  const onCreate = useCallback(async () => {
    setBusy(true);
    try {
      const created = await createShareLink(modelId, ttl);
      await copy(created.token, created.id);
      await reload();
    } finally {
      setBusy(false);
    }
  }, [copy, modelId, reload, ttl]);

  const onRevoke = useCallback(
    async (linkId: string) => {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      try {
        await revokeShareLink(linkId, modelId);
      } catch {
        // Revert optimistic removal by reloading the truthful list.
        void reload();
      }
    },
    [modelId, reload],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share this design"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 px-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-900/10 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">Share this design</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            ×
          </button>
        </header>

        <section className="mb-5 flex items-center gap-2">
          <select
            aria-label="Link expires after"
            value={ttl}
            onChange={(e) => setTtl(e.target.value as ShareTtl)}
            className="rounded-md border border-zinc-900/10 px-2 py-1 text-[13px]"
          >
            {TTL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            className="inline-flex items-center rounded-md bg-[#c0613d] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#cf6e47] disabled:opacity-50"
          >
            Create link
          </button>
        </section>

        <ul className="flex flex-col gap-2" data-testid="share-link-list">
          {links.length === 0 ? (
            <li className="text-[13px] text-zinc-500">No active links yet.</li>
          ) : null}
          {links.map((l) => (
            <li
              key={l.id}
              className="flex flex-col gap-1 rounded-md border border-zinc-900/10 bg-zinc-50 p-2"
              data-testid="share-link-row"
            >
              <div className="flex items-center justify-between gap-2">
                <code className="truncate text-[12px] text-zinc-700">{buildUrl(l.token)}</code>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copy(l.token, l.id)}
                    className="rounded-md px-2 py-1 text-[12px] hover:bg-zinc-900/5"
                  >
                    {copiedId === l.id ? 'Copied' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevoke(l.id)}
                    className="rounded-md px-2 py-1 text-[12px] text-red-600 hover:bg-red-50"
                  >
                    Revoke
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-zinc-500">{formatExpiry(l.expires_at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
