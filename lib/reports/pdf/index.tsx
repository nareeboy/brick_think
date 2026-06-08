import { Document, renderToBuffer } from '@react-pdf/renderer';

import { Closing } from './Closing';
import { Cover } from './Cover';
import { ExecutiveSummary } from './ExecutiveSummary';
import type { ModelCardData } from './ModelCard';
import { StageSection } from './StageSection';
import { registerReportFonts } from './fonts';

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

export async function renderSessionReportPdf(data: SessionReportData): Promise<Buffer> {
  registerReportFonts();

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
      />
      <ExecutiveSummary
        sessionTitle={data.sessionTitle}
        body={data.execSummary}
        pageNumber={++pageCursor}
        totalPages={totalPages}
      />
      {data.stages.map((s) => (
        <StageSection
          key={s.stageType}
          stageType={s.stageType}
          models={s.models}
          sessionTitle={data.sessionTitle}
          pageNumber={++pageCursor}
          totalPages={totalPages}
        />
      ))}
      <Closing
        body={data.closing}
        sessionTitle={data.sessionTitle}
        pageNumber={++pageCursor}
        totalPages={totalPages}
      />
    </Document>
  );

  return renderToBuffer(doc);
}
