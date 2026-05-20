import { describe, it, expect } from 'vitest';

import { renderSessionReportPdf } from '@/lib/reports/pdf';

describe('renderSessionReportPdf', () => {
  it('produces a non-empty PDF buffer for a minimal fixture', async () => {
    const buf = await renderSessionReportPdf({
      sessionTitle: 'Fixture Session',
      orgName: 'Acme Co',
      facilitatorName: 'Alice',
      date: '2026-05-19',
      participantCount: 2,
      execSummary: 'Para one.\n\nPara two.',
      closing: 'Closing para.\n\nNext steps: keep going.',
      stages: [
        {
          stageType: 'individual_model',
          models: [
            {
              id: 'm1',
              title: "Bob's model",
              ownerLabel: 'Bob',
              imageDataUri: null,
              description: 'A description of what Bob built.',
            },
          ],
        },
      ],
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000); // any non-trivial PDF is >1KB
    expect(buf.subarray(0, 4).toString()).toBe('%PDF'); // PDF magic number
  });
});
