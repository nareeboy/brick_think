import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { fetchRecentNotifications } from '@/app/(authed)/app/notifications/actions';
import { GlobalHeader } from '@/components/app/GlobalHeader';
import { HideOnChromelessRoutes } from '@/components/app/HideOnChromelessRoutes';
import { PresenceHeartbeat } from '@/components/app/PresenceHeartbeat';
import { getGlobalRole } from '@/lib/account/globalRole';
import { getMyActiveSessionsForNav } from '@/lib/sessions/navSessions';
import { NotificationToast } from '@/components/notifications/NotificationToast';
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome';
import { RoleChooserRedirect } from '@/components/onboarding/RoleChooserRedirect';
import { isTutorialGuest } from '@/lib/onboarding/guestGate';
import { NotificationsProvider } from '@/components/notifications/NotificationsProvider';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { ChatWidgetSlot } from '@/lib/premium/server-slots';

export const dynamic = 'force-dynamic';

// The authed product is private; keep it out of search indexes entirely
// (belt-and-suspenders with the /app/ disallow in robots.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthedAppLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp');

  const profileRes = await supabase
    .from('profiles')
    .select('full_name, email, is_site_admin')
    .eq('id', user.id)
    .single();

  if (profileRes.error) {
    throw new Error(`Failed to load profile: ${profileRes.error.message}`);
  }

  const email = profileRes.data?.email ?? user.email ?? null;
  // When profiles.full_name happens to equal the email's local part (e.g.
  // Google OAuth backfilled "mail" from "mail@example.com"), the name
  // looks like a truncated email in the header. Fall through to the full
  // email in that case. Legitimate names (containing a space, or distinct
  // from the local part) are still preferred.
  const fullName = profileRes.data?.full_name?.trim() || null;
  const emailLocalPart = email?.split('@')[0]?.toLowerCase() ?? null;
  const fullNameLooksLikeEmailPrefix =
    fullName !== null && emailLocalPart !== null && fullName.toLowerCase() === emailLocalPart;
  const userName = (fullNameLooksLikeEmailPrefix ? null : fullName) || email || 'You';
  const isSiteAdmin = profileRes.data?.is_site_admin === true;
  const [role, navSessions, initialNotifications, tutorialGuest] = await Promise.all([
    getGlobalRole(supabase, user.id),
    getMyActiveSessionsForNav(supabase, user.id),
    fetchRecentNotifications(),
    isTutorialGuest(supabase, user.id),
  ]);

  return (
    <NotificationsProvider profileId={user.id} initial={initialNotifications}>
      <div className="flex h-[100dvh] flex-col bg-[#FAF7F1] text-zinc-900">
        <HideOnChromelessRoutes>
          <GlobalHeader
            userId={user.id}
            userName={userName}
            userEmail={email}
            role={role}
            isSiteAdmin={isSiteAdmin}
            sessions={navSessions}
          />
        </HideOnChromelessRoutes>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        <NotificationToast />
        <HideOnChromelessRoutes>
          <ChatWidgetSlot profileId={user.id} />
        </HideOnChromelessRoutes>
        <PresenceHeartbeat />
        {/* Global welcome/tutorial modal — decides for itself when to show
            (hub pages, or the reprise after a pathway completes). Invited
            guests never see it; they still get the in-context spotlight
            tours (session page + canvas). */}
        <Suspense fallback={null}>
          <RoleChooserRedirect guest={tutorialGuest} />
        </Suspense>
        <Suspense fallback={null}>
          <OnboardingWelcome guest={tutorialGuest} />
        </Suspense>
      </div>
    </NotificationsProvider>
  );
}
