'use client';

import { useCallback, useRef, useState } from 'react';

import { Toast, type ToastVariant } from '@/components/notifications/Toast';
import { toastVariantForKind } from '@/lib/notifications/toastVariant';
import type { NotificationKind } from '@/lib/notifications/types';

/**
 * Dev/QA harness for the redesigned in-app toast. Shows a static gallery of
 * each variant (matching the agreed reference) plus live "fire" buttons that
 * stack real <Toast> instances bottom-centre. Mapping the app's actual
 * notifications (org added, session started, …) onto these variants is the
 * next step — this page is the design review surface.
 */

interface DemoSpec {
  variant: ToastVariant;
  title: string;
  description: string;
  /** Whether the demo card carries a "Try again"-style action button. */
  withAction?: boolean;
  /** Whether the demo card is dismissible (renders the × ). */
  withDismiss?: boolean;
}

const DEMOS: DemoSpec[] = [
  {
    variant: 'error',
    title: 'Error Occurred',
    description: 'Sorry, please try again later.',
    withAction: true,
  },
  {
    variant: 'success',
    title: 'Message Sent',
    description: "Your message has been sent. We'll get back to you soon.",
    withDismiss: true,
  },
  {
    variant: 'info',
    title: 'Attention',
    description: 'Our website will be undergoing scheduled maintenance tonight from 10 PM to 2 AM.',
  },
  {
    variant: 'warning',
    title: 'Heads up',
    description: 'Your session will expire in 5 minutes unless there is activity.',
    withDismiss: true,
  },
];

/** The app's real notification toasts. Variant is derived from `kind` via the
 *  shared toastVariantForKind map (same one the live <NotificationToast> uses). */
interface ToastEvent {
  key: string;
  kind: NotificationKind;
  label: string;
  firesWhen: string;
  source: string;
  title: string;
  body: string | null;
}

interface EventGroup {
  heading: string;
  blurb: string;
  events: ToastEvent[];
}

const EVENT_GROUPS: EventGroup[] = [
  {
    heading: 'Organisations / Workshops',
    blurb: 'Membership changes on an org (workshop).',
    events: [
      {
        key: 'org_added_recipient',
        kind: 'org_added',
        label: 'Added to an org (recipient)',
        firesWhen: 'You are added to an org by an admin.',
        source: 'lib/notifications/dispatch.ts · dispatchOrgAddedNotification',
        title: 'Jordan Rivera added you to Acme Workshops',
        body: null,
      },
      {
        key: 'org_added_admin_confirm',
        kind: 'org_added',
        label: 'Member added (admin confirm)',
        firesWhen: 'Admin adds an existing user via the Add member dialog.',
        source: 'app/(authed)/app/workshops/[id]/AddMemberDialog.tsx',
        title: 'Sam Patel was added to Acme Workshops',
        body: 'They have been notified.',
      },
      {
        key: 'org_invite_sent',
        kind: 'org_added',
        label: 'Invite sent (admin confirm)',
        firesWhen: 'Admin invites an email with no existing account.',
        source: 'app/(authed)/app/workshops/[id]/AddMemberDialog.tsx',
        title: 'Invite sent to newcomer@example.com',
        body: "They'll join Acme Workshops after signing up.",
      },
    ],
  },
  {
    heading: 'Sessions',
    blurb: 'A facilitator starts a session.',
    events: [
      {
        key: 'session_started',
        kind: 'session_started',
        label: 'Session started',
        firesWhen: 'Facilitator starts a session — every other org member is notified.',
        source: 'lib/notifications/dispatch.ts · dispatchSessionStartedNotifications',
        title: 'Dr. Lee started a session',
        body: 'Join in — the first stage is now active.',
      },
      {
        key: 'session_ended',
        kind: 'session_ended',
        label: 'Session stopped (facilitator)',
        firesWhen: 'Facilitator stops the session — every org member is warned it has wrapped up.',
        source: 'lib/notifications/dispatch.ts · dispatchSessionEndedNotifications',
        title: 'Dr. Lee ended the session',
        body: 'This session is now complete.',
      },
    ],
  },
  {
    heading: 'Participants',
    blurb: 'Someone joins a session you facilitate.',
    events: [
      {
        key: 'participant_joined',
        kind: 'participant_joined',
        label: 'Participant joined (join code)',
        firesWhen: 'A participant joins via the shared join code.',
        source: 'lib/notifications/dispatch.ts · dispatchParticipantJoinedNotification',
        title: 'Alex Kim joined Team Alignment Workshop',
        body: null,
      },
      {
        key: 'session_invitation_claimed',
        kind: 'session_invitation_claimed',
        label: 'Invitation claimed (magic link)',
        firesWhen: 'An invited user claims a magic-link / invite code.',
        source: 'supabase migration · handle_new_user trigger',
        title: 'Alex Kim joined Team Alignment Workshop',
        body: null,
      },
    ],
  },
];

interface LiveToast {
  id: number;
  variant: ToastVariant;
  title: string;
  description: string;
  withAction: boolean;
  withDismiss: boolean;
}

export function ToastTestClient() {
  const [live, setLive] = useState<LiveToast[]>([]);
  const idRef = useRef(0);

  const fire = useCallback((spec: DemoSpec) => {
    idRef.current += 1;
    const id = idRef.current;
    setLive((prev) => [
      ...prev,
      {
        id,
        variant: spec.variant,
        title: spec.title,
        description: spec.description,
        withAction: spec.withAction ?? false,
        // Anything fired into the live stack is dismissible so it can be cleared.
        withDismiss: true,
      },
    ]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setLive((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">Variants</h2>
            <p className="text-[12px] text-zinc-500">
              The redesigned toast. Each variant carries its own tint, icon chip, and live-region
              politeness. Errors can offer an action; any toast can be dismissible.
            </p>
          </div>
          <button
            type="button"
            onClick={() => DEMOS.forEach(fire)}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-xl bg-[#a8482a] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#8f3c22] active:scale-[0.98]"
          >
            Fire all
          </button>
        </div>

        <div className="flex max-w-xl flex-col gap-5">
          {DEMOS.map((demo) => (
            <div key={demo.variant} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {demo.variant}
                </span>
                <button
                  type="button"
                  onClick={() => fire(demo)}
                  className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-lg border border-zinc-900/10 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
                >
                  Fire as toast
                </button>
              </div>
              <Toast
                variant={demo.variant}
                title={demo.title}
                description={demo.description}
                action={
                  demo.withAction ? { label: 'Try again', onClick: () => fire(demo) } : undefined
                }
                onDismiss={demo.withDismiss ? () => {} : undefined}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5 border-t border-zinc-900/10 pt-8">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">
            Notification events
          </h2>
          <p className="text-[12px] text-zinc-500">
            Every real in-app notification, mapped onto a variant above. Click{' '}
            <span className="font-medium text-zinc-700">Show toast</span> to fire it into the live
            top-right stack.
          </p>
        </div>

        {EVENT_GROUPS.map((group) => (
          <div key={group.heading} className="flex flex-col gap-3">
            <div>
              <h3 className="text-[13px] font-semibold tracking-tight text-zinc-800">
                {group.heading}
              </h3>
              <p className="text-[12px] text-zinc-500">{group.blurb}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.events.map((e) => {
                const variant = toastVariantForKind(e.kind);
                return (
                  <div
                    key={e.key}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex w-fit items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                          {e.kind}
                        </span>
                        <span className="inline-flex w-fit items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                          {variant}
                        </span>
                      </div>
                      <span className="mt-1 text-[13px] font-medium text-zinc-900">{e.label}</span>
                      <span className="text-[12px] text-zinc-500">{e.firesWhen}</span>
                    </div>

                    <div className="rounded-xl border border-zinc-900/5 bg-zinc-50 px-3 py-2">
                      <p className="text-[12px] font-medium text-zinc-800">{e.title}</p>
                      {e.body ? <p className="text-[11px] text-zinc-500">{e.body}</p> : null}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate font-mono text-[9px] text-zinc-400"
                        title={e.source}
                      >
                        {e.source}
                      </span>
                      <button
                        type="button"
                        onClick={() => fire({ variant, title: e.title, description: e.body ?? '' })}
                        className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-xl bg-[#a8482a] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#8f3c22] active:scale-[0.98]"
                      >
                        Show toast
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Live top-right stack — fired toasts slide in from the right, newest at the bottom. */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col items-end gap-3">
        {live.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            title={t.title}
            description={t.description}
            action={t.withAction ? { label: 'Try again', onClick: () => dismiss(t.id) } : undefined}
            onDismiss={t.withDismiss ? () => dismiss(t.id) : undefined}
            className="animate-toast-in pointer-events-auto w-[min(34rem,calc(100vw-2rem))]"
          />
        ))}
      </div>
    </div>
  );
}
