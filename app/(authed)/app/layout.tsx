import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { fetchRecentNotifications } from '@/app/(authed)/app/notifications/actions';
import { GlobalHeader } from '@/components/app/GlobalHeader';
import { getMyActiveSessionsForNav } from '@/lib/sessions/navSessions';
import { NotificationToast } from '@/components/notifications/NotificationToast';
import { NotificationsProvider } from '@/components/notifications/NotificationsProvider';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

export const dynamic = 'force-dynamic';

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
    .select('full_name, email, avatar_url, is_site_admin')
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
  const userAvatarUrl = profileRes.data?.avatar_url ?? null;
  const isSiteAdmin = profileRes.data?.is_site_admin === true;
  const navSessions = await getMyActiveSessionsForNav(supabase, user.id);
  const initialNotifications = await fetchRecentNotifications();

  return (
    <NotificationsProvider profileId={user.id} initial={initialNotifications}>
      <div className="flex h-[100dvh] flex-col bg-[#FAF7F1] text-zinc-900">
        <GlobalHeader
          userName={userName}
          userEmail={email}
          userAvatarUrl={userAvatarUrl}
          isSiteAdmin={isSiteAdmin}
          sessions={navSessions}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        <NotificationToast />
      </div>
    </NotificationsProvider>
  );
}
