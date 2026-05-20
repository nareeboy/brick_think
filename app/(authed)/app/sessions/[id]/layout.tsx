import { SpotlightBanner } from '@/components/session/SpotlightBanner';
import { createServerSupabaseClient } from '@/lib/db/server';

export default async function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {user && <SpotlightBanner sessionId={id} viewerProfileId={user.id} />}
      {children}
    </>
  );
}
