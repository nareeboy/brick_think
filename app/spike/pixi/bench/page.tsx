import { PixiBenchLoader } from '@/components/spike/loaders';
import { SpikeShell } from '@/components/spike/SpikeShell';

export const metadata = {
  title: 'Pixi bench',
};

export default function PixiBenchPage() {
  return (
    <SpikeShell
      title="Pixi benchmark"
      subtitle="2500 sprites animated for 5 seconds. Final FPS and frame-time percentiles appear above the canvas when the run completes."
    >
      <PixiBenchLoader />
    </SpikeShell>
  );
}
