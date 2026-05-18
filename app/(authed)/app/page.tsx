import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Pure redirect — Next.js never renders HTML for this route, so a metadata
// export would have no observable effect. No title needed here.
export default function AppRoot() {
  redirect('/app/my-designs');
}
