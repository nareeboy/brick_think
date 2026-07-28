'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import {
  TRIGGER_TYPES,
  TRIGGER_TYPE_LABELS,
  WEBHOOK_DESCRIPTION_MAX,
  WEBHOOK_TYPE_MAX,
} from '@/lib/webhooks/constants';
import type { WebhookConfig, WebhookDelivery } from '@/lib/webhooks/types';
import {
  addWebhookAction,
  deleteWebhookAction,
  toggleWebhookActiveAction,
  updateWebhookAction,
  type WebhookActionResult,
} from './actions';

const CODE_MESSAGES: Record<string, string> = {
  forbidden: 'You do not have permission to do that.',
  unauthenticated: 'Please sign in again.',
  invalid_type: `Webhook type must be 1–${WEBHOOK_TYPE_MAX} characters.`,
  invalid_url: 'Webhook URL must be a valid https:// address.',
  invalid_trigger: 'Choose a valid trigger type.',
  invalid_delay: 'Delay must be a whole number of days (0–365).',
  invalid_description: `Description must be under ${WEBHOOK_DESCRIPTION_MAX} characters.`,
  type_taken: 'A webhook with that type already exists.',
  not_found: 'That webhook no longer exists — refresh the page.',
  unknown: 'Something went wrong.',
};

function messageFor(result: WebhookActionResult): string | null {
  if (result.ok) return null;
  return CODE_MESSAGES[result.code] ?? CODE_MESSAGES.unknown ?? 'Something went wrong.';
}

const INPUT_CLASS =
  'mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#a8482a] focus:outline-none focus:ring-1 focus:ring-[#a8482a]';
const LABEL_CLASS = 'block text-sm font-medium text-zinc-800';
const PILL_CLASS =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]';

// Timestamps are rendered on the server first (UTC on Railway) and hydrated in
// the viewer's timezone — pinning to UTC keeps the two renders identical.
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function formatInstant(iso: string): string {
  return `${TIME_FORMAT.format(new Date(iso))} UTC`;
}

function delayLabel(config: WebhookConfig): string {
  if (config.triggerType === 'manual') return '—';
  if (config.delayDays === 0) return 'Immediate';
  return config.delayDays === 1 ? '1 day' : `${config.delayDays} days`;
}

interface Props {
  configs: WebhookConfig[];
  deliveries: WebhookDelivery[];
}

export function WebhooksManager({ configs, deliveries }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<WebhookConfig | null>(null);
  const [deleting, setDeleting] = useState<WebhookConfig | null>(null);

  async function runRowAction(id: string, act: () => Promise<WebhookActionResult>) {
    setBusyId(id);
    setRowError(null);
    try {
      const result = await act();
      setRowError(messageFor(result));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">Webhook configuration</h2>
            <p className="text-[13px] text-zinc-500">
              Active signup hooks fire for every new registration.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors duration-200 hover:border-zinc-900/20 hover:text-zinc-900 disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            Refresh
          </button>
        </div>

        {rowError ? <p className="mt-3 text-sm text-rose-700">{rowError}</p> : null}

        {configs.length === 0 ? (
          <p className="mt-4 text-zinc-600">No webhooks configured yet.</p>
        ) : (
          <>
            <div className="mt-4 hidden grid-cols-12 gap-3 border-b border-zinc-900/5 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 md:grid">
              <span className="col-span-2">Type</span>
              <span className="col-span-3">URL</span>
              <span className="col-span-1">Trigger</span>
              <span className="col-span-1">Delay</span>
              <span className="col-span-2">Description</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>
            <ul className="divide-y divide-zinc-900/5">
              {configs.map((config) => {
                const busy = busyId === config.id;
                return (
                  <li
                    key={config.id}
                    className="grid grid-cols-1 gap-2 py-3 md:grid-cols-12 md:items-center md:gap-3"
                  >
                    <span className="col-span-2 truncate font-mono text-[13px] font-medium text-zinc-900">
                      {config.webhookType}
                    </span>
                    <span
                      className="col-span-3 truncate text-[13px] text-zinc-500"
                      title={config.webhookUrl}
                    >
                      {config.webhookUrl}
                    </span>
                    <span className="col-span-1">
                      <span
                        className={`${PILL_CLASS} ${
                          config.triggerType === 'signup'
                            ? 'bg-sky-50 text-sky-800'
                            : 'bg-zinc-900/5 text-zinc-600'
                        }`}
                      >
                        {config.triggerType}
                      </span>
                    </span>
                    <span className="col-span-1 text-[13px] text-zinc-700">
                      {delayLabel(config)}
                    </span>
                    <span
                      className="col-span-2 truncate text-[13px] text-zinc-600"
                      title={config.description ?? undefined}
                    >
                      {config.description ?? '—'}
                    </span>
                    <span className="col-span-1">
                      <span
                        className={`${PILL_CLASS} ${
                          config.isActive
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-zinc-900/5 text-zinc-600'
                        }`}
                      >
                        {config.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </span>
                    <span className="col-span-2 flex items-center gap-1 md:justify-end">
                      <button
                        type="button"
                        onClick={() => setEditing(config)}
                        disabled={busy}
                        aria-label={`Edit ${config.webhookType}`}
                        title="Edit"
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 disabled:opacity-60"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="h-4 w-4"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          runRowAction(config.id, () =>
                            toggleWebhookActiveAction(config.id, !config.isActive),
                          )
                        }
                        disabled={busy}
                        className="inline-flex h-9 cursor-pointer items-center rounded-lg px-2 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 disabled:opacity-60"
                      >
                        {config.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(config)}
                        disabled={busy}
                        aria-label={`Delete ${config.webhookType}`}
                        title="Delete"
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="h-4 w-4"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <AddWebhookForm />

      <RecentDeliveries deliveries={deliveries} />

      {editing ? <EditWebhookDialog config={editing} onClose={() => setEditing(null)} /> : null}

      {deleting ? (
        <DeleteConfirmDialog
          title={`Delete ${deleting.webhookType}?`}
          description={
            <>
              The webhook and its still-queued deliveries are removed. Deliveries that already fired
              stay in the log.
            </>
          }
          pending={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await runRowAction(deleting.id, () => deleteWebhookAction(deleting.id));
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}

function WebhookFields({ initial, showType }: { initial?: WebhookConfig; showType: boolean }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {showType ? (
          <label className={LABEL_CLASS}>
            Webhook type
            <input
              name="webhookType"
              required
              maxLength={WEBHOOK_TYPE_MAX}
              placeholder="e.g. day_7, signup_welcome"
              className={INPUT_CLASS}
            />
          </label>
        ) : null}
        <label className={LABEL_CLASS}>
          Webhook URL
          <input
            name="webhookUrl"
            type="url"
            required
            defaultValue={initial?.webhookUrl}
            placeholder="https://hook.eu2.make.com/…"
            className={INPUT_CLASS}
          />
        </label>
        <label className={LABEL_CLASS}>
          Delay (days)
          <input
            name="delayDays"
            type="number"
            min={0}
            max={365}
            step={1}
            required
            defaultValue={initial?.delayDays ?? 0}
            className={INPUT_CLASS}
          />
        </label>
        <label className={LABEL_CLASS}>
          Trigger type
          <select
            name="triggerType"
            defaultValue={initial?.triggerType ?? 'signup'}
            className={INPUT_CLASS}
          >
            {TRIGGER_TYPES.map((trigger) => (
              <option key={trigger} value={trigger}>
                {TRIGGER_TYPE_LABELS[trigger]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={LABEL_CLASS}>
        Description
        <input
          name="description"
          maxLength={WEBHOOK_DESCRIPTION_MAX}
          defaultValue={initial?.description ?? undefined}
          placeholder="e.g. 7-day engagement check-in email"
          className={INPUT_CLASS}
        />
      </label>
    </>
  );
}

function AddWebhookForm() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await addWebhookAction(new FormData(event.currentTarget));
      const message = messageFor(result);
      if (message) {
        setError(message);
      } else {
        setSaved(true);
        formRef.current?.reset();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="text-[15px] font-semibold text-zinc-900">Add new webhook</h2>
      <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
        <WebhookFields showType />
        <div className="flex items-center justify-between gap-4">
          <div aria-live="polite">
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            {saved ? <p className="text-sm text-emerald-700">Webhook added.</p> : null}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-md bg-[#a8482a] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add webhook'}
          </button>
        </div>
      </form>
    </section>
  );
}

function EditWebhookDialog({ config, onClose }: { config: WebhookConfig; onClose: () => void }) {
  const titleId = useId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await updateWebhookAction(config.id, new FormData(event.currentTarget));
      const message = messageFor(result);
      if (message) {
        setError(message);
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-lg">
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="text-[16px] font-semibold text-zinc-950">
          Edit <span className="font-mono">{config.webhookType}</span>
        </h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className={LABEL_CLASS}>
            Webhook URL
            <input
              ref={firstInputRef}
              name="webhookUrl"
              type="url"
              required
              defaultValue={config.webhookUrl}
              className={INPUT_CLASS}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL_CLASS}>
              Delay (days)
              <input
                name="delayDays"
                type="number"
                min={0}
                max={365}
                step={1}
                required
                defaultValue={config.delayDays}
                className={INPUT_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              Trigger type
              <select name="triggerType" defaultValue={config.triggerType} className={INPUT_CLASS}>
                {TRIGGER_TYPES.map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {TRIGGER_TYPE_LABELS[trigger]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={LABEL_CLASS}>
            Description
            <input
              name="description"
              maxLength={WEBHOOK_DESCRIPTION_MAX}
              defaultValue={config.description ?? undefined}
              className={INPUT_CLASS}
            />
          </label>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

function RecentDeliveries({ deliveries }: { deliveries: WebhookDelivery[] }) {
  return (
    <section className="rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="text-[15px] font-semibold text-zinc-900">Recent deliveries</h2>
      <p className="text-[13px] text-zinc-500">
        The last {deliveries.length === 0 ? 'few' : deliveries.length} webhook posts — sent and
        still queued.
      </p>
      {deliveries.length === 0 ? (
        <p className="mt-4 text-zinc-600">No deliveries yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-900/5">
          {deliveries.map((delivery) => (
            <li
              key={delivery.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="truncate text-[13px] font-medium text-zinc-900">
                  {delivery.email}
                </span>
                <span className={`${PILL_CLASS} bg-zinc-900/5 text-zinc-600`}>
                  {delivery.webhookType}
                </span>
              </span>
              <span className="shrink-0 text-[12px]">
                {delivery.errorMessage ? (
                  <span className="text-rose-700" title={delivery.errorMessage}>
                    Failed — retries at next run
                  </span>
                ) : delivery.sentAt ? (
                  <span className="text-emerald-700">Sent {formatInstant(delivery.sentAt)}</span>
                ) : (
                  <span className="text-amber-700">
                    Queued for {formatInstant(delivery.scheduledFor)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
