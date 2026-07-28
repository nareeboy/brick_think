import { redirect } from 'next/navigation';

import { listRecentWebhookDeliveries, listWebhookConfigs } from '@/lib/webhooks/queries';
import { WebhooksManager } from './WebhooksManager';

export const metadata = {
  title: 'Webhooks · Admin · BrickThink',
};

export default async function AdminWebhooksPage() {
  const [configs, deliveries] = await Promise.all([
    listWebhookConfigs(),
    listRecentWebhookDeliveries(),
  ]);
  // Layout already gates on site admin; this is defence-in-depth.
  if (!configs) redirect('/app/my-designs');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl text-zinc-950">Webhooks</h1>
        <p className="text-[14px] text-zinc-600">
          Send signups to external services (Make, Zapier) — immediately or a few days later. Signup
          hooks fire for new users only; existing accounts are never re-fired.
        </p>
      </header>
      <WebhooksManager configs={configs} deliveries={deliveries ?? []} />
    </div>
  );
}
