import { KonvaBenchLoader } from '@/components/spike/loaders';
import { SpikeShell } from '@/components/spike/SpikeShell';

export const metadata = {
  title: 'Konva bench',
};

export default function KonvaBenchPage() {
  return (
    <SpikeShell
      title="Konva benchmark"
      subtitle="2500 sprites animated for 5 seconds. Final FPS and frame-time percentiles appear above the canvas when the run completes."
    >
      <KonvaBenchLoader />
    </SpikeShell>
  );
}
