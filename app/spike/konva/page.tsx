import { KonvaInteractiveLoader } from '@/components/spike/loaders';
import { SpikeShell } from '@/components/spike/SpikeShell';

export const metadata = {
  title: 'Konva demo',
};

export default function KonvaDemoPage() {
  return (
    <SpikeShell
      title="Konva interactive demo"
      subtitle="Five bricks. Click to select. Drag with the pointer. Rotate or recolour with the toolbar."
    >
      <KonvaInteractiveLoader />
    </SpikeShell>
  );
}
