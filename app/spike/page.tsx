import Link from 'next/link';

import { SpikeShell } from '@/components/spike/SpikeShell';

export const metadata = {
  title: 'Canvas spike',
};

const ROUTES = [
  {
    href: '/spike/konva',
    title: 'Konva interactive demo',
    body: 'Five bricks. Drag, rotate, recolour. Powered by react-konva.',
  },
  {
    href: '/spike/konva/bench',
    title: 'Konva benchmark',
    body: '25 simulated participants times 100 bricks. Animated for 5 seconds. Reports FPS.',
  },
  {
    href: '/spike/pixi',
    title: 'Pixi interactive demo',
    body: 'Same five-brick exercise rendered with Pixi.js v8.',
  },
  {
    href: '/spike/pixi/bench',
    title: 'Pixi benchmark',
    body: 'Same load profile as the Konva benchmark, rendered through Pixi.',
  },
  {
    href: '/spike/yjs',
    title: 'Yjs collaboration PoC',
    body: 'Two browser tabs share a canvas in real time. Presence cursors and idle persistence to Postgres.',
  },
];

export default function SpikeIndexPage() {
  return (
    <SpikeShell
      title="Canvas spike"
      subtitle="Phase 0 step 7. Compare Konva and Pixi on the same workload."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {ROUTES.map((route) => (
          <li key={route.href}>
            <Link
              href={route.href}
              className="block rounded-lg border border-border bg-background p-4 transition-colors hover:border-foreground/30 hover:bg-muted"
            >
              <p className="font-medium">{route.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{route.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </SpikeShell>
  );
}
