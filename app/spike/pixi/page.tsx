import { PixiInteractiveLoader } from '@/components/spike/loaders';
import { SpikeShell } from '@/components/spike/SpikeShell';

export const metadata = {
  title: 'Pixi demo',
};

export default function PixiDemoPage() {
  return (
    <SpikeShell
      title="Pixi interactive demo"
      subtitle="Five bricks rendered with Pixi.js v8. Click to select. Drag with the pointer. Rotate or recolour with the toolbar."
    >
      <PixiInteractiveLoader />
    </SpikeShell>
  );
}
