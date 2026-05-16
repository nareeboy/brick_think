'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import type { OrgSummary } from '@/lib/orgs/types';

import { duplicateToSessionAction } from './actions';
import { listOrgSessionsAction, type SessionOption } from './listSessionsAction';

interface Props {
  sourceModelId: string;
  orgs: OrgSummary[];
  onClose: () => void;
}

export function SendToSessionDialog({ sourceModelId, orgs, onClose }: Props) {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!orgId) return;
    listOrgSessionsAction(orgId)
      .then(setSessions)
      .catch((e) => setError(e.message));
  }, [orgId]);

  function send(sessionId: string) {
    if (!orgId) return;
    start(async () => {
      try {
        const newId = await duplicateToSessionAction({
          sourceModelId,
          orgId,
          sessionId,
        });
        onClose();
        router.push(`/app/designs/${newId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Send failed');
      }
    });
  }

  return (
    <ModalBackdrop dataTestid="send-to-session-dialog" titleId={titleId} onClose={onClose}>
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Send to a session
        </h2>
        <p className="mt-1 text-[13px] text-zinc-600">
          A copy of this design will be created in the chosen session.
        </p>
        {!orgId ? (
          <ul className="mt-4 flex flex-col gap-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  data-testid={`send-org-${o.id}`}
                  onClick={() => setOrgId(o.id)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-900/10 px-4 py-3 text-left text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-[#FAF7F1]"
                >
                  {o.name}
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
            {orgs.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-900/15 px-4 py-3 text-[13px] text-zinc-500">
                You are not a member of any organisation.
              </li>
            ) : null}
          </ul>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  data-testid={`send-session-${s.id}`}
                  onClick={() => send(s.id)}
                  disabled={pending}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-900/10 px-4 py-3 text-left text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-[#FAF7F1] disabled:opacity-60"
                >
                  {s.title}
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
            {sessions.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-900/15 px-4 py-3 text-[13px] text-zinc-500">
                No sessions in this organisation yet.
              </li>
            ) : null}
            <li>
              <button
                type="button"
                onClick={() => setOrgId(null)}
                className="mt-2 self-start text-[13px] text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
              >
                ← Back
              </button>
            </li>
          </ul>
        )}
        {error ? (
          <p data-testid="send-error" className="mt-4 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[13px] font-medium text-zinc-500 hover:text-zinc-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
