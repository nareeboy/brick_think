import { Font } from '@react-pdf/renderer';
import path from 'node:path';

let registered = false;

export function registerReportFonts() {
  if (registered) return;
  const here = (rel: string) => path.join(process.cwd(), 'lib/reports/pdf/fonts', rel);

  Font.register({
    family: 'Fraunces',
    fonts: [
      { src: here('Fraunces-Regular.ttf'), fontWeight: 400 },
      { src: here('Fraunces-SemiBold.ttf'), fontWeight: 600 },
    ],
  });

  Font.register({
    family: 'Geist',
    fonts: [
      { src: here('Geist-Regular.ttf'), fontWeight: 400 },
      { src: here('Geist-Medium.ttf'), fontWeight: 500 },
    ],
  });

  registered = true;
}
