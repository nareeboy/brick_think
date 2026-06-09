import { Document, renderToBuffer } from '@react-pdf/renderer';

import type { ResolvedBranding } from '@/lib/branding/types';

import { Closing } from './Closing';
import { Cover } from './Cover';
import { ExecutiveSummary } from './ExecutiveSummary';
import type { ModelCardData } from './ModelCard';
import { StageSection } from './StageSection';
import { registerBrandFonts } from './fonts';
import { createStyles } from './styles';

export interface SessionReportData {
  sessionTitle: string;
  orgName: string;
  facilitatorName: string;
  date: string;
  participantCount: number;
  execSummary: string;
  closing: string;
  stages: Array<{ stageType: string; models: ModelCardData[] }>;
}

export async function renderSessionReportPdf(
  data: SessionReportData,
  branding: ResolvedBranding | null = null,
): Promise<Buffer> {
  await registerBrandFonts(branding);

  const { sheet, palette } = createStyles(branding);
  const footerLabel = branding ? (branding.footerContact ?? branding.displayName) : 'BrickThink';

  // Cover (1) + exec summary (1) + one page per stage + closing (1).
  const totalPages = 1 + 1 + data.stages.length + 1;
  let pageCursor = 1;

  const doc = (
    <Document>
      <Cover
        sessionTitle={data.sessionTitle}
        orgName={data.orgName}
        facilitatorName={data.facilitatorName}
        date={data.date}
        participantCount={data.participantCount}
        styles={sheet}
        branding={branding}
      />
      <ExecutiveSummary
        sessionTitle={data.sessionTitle}
        body={data.execSummary}
        pageNumber={++pageCursor}
        totalPages={totalPages}
        styles={sheet}
        footerLabel={footerLabel}
      />
      {data.stages.map((s) => (
        <StageSection
          key={s.stageType}
          stageType={s.stageType}
          models={s.models}
          sessionTitle={data.sessionTitle}
          pageNumber={++pageCursor}
          totalPages={totalPages}
          styles={sheet}
          footerLabel={footerLabel}
          primary={palette.primary}
          mutedInk={palette.mutedInk}
        />
      ))}
      <Closing
        body={data.closing}
        sessionTitle={data.sessionTitle}
        pageNumber={++pageCursor}
        totalPages={totalPages}
        styles={sheet}
        footerLabel={footerLabel}
      />
    </Document>
  );

  return renderToBuffer(doc);
}
