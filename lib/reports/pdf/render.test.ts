import { describe, expect, it } from 'vitest';

import { renderSessionReportPdf, type SessionReportData } from './index';

const DATA: SessionReportData = {
  sessionTitle: 'Test session',
  orgName: 'Test Org',
  facilitatorName: 'Fac',
  date: '2026-06-09',
  participantCount: 3,
  execSummary: 'Summary para one.\n\nPara two.',
  closing: 'Closing para.',
  stages: [
    {
      stageType: 'shared_model',
      models: [
        { id: 'm1', title: 'Model', ownerLabel: 'Room 1', imageDataUri: null, description: 'desc' },
      ],
    },
  ],
};

describe('renderSessionReportPdf', () => {
  it('renders the default (null branding) report to a non-empty PDF buffer', async () => {
    const buf = await renderSessionReportPdf(DATA, null);
    expect(buf.byteLength).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders a branded report (curated fonts, no logo) without throwing', async () => {
    const buf = await renderSessionReportPdf(DATA, {
      displayName: 'Acme Consulting',
      footerContact: 'hello@acme.com',
      brandColour: '#1d4ed8',
      accentColour: '#f59e0b',
      coverInk: '#ffffff',
      logoDataUri: null,
      headingFamily: 'Fraunces',
      bodyFamily: 'Geist',
    });
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('branded output differs from the default report', async () => {
    const deflt = await renderSessionReportPdf(DATA, null);
    const branded = await renderSessionReportPdf(DATA, {
      displayName: 'Acme Consulting',
      footerContact: 'hello@acme.com',
      brandColour: '#1d4ed8',
      accentColour: '#f59e0b',
      coverInk: '#ffffff',
      logoDataUri: null,
      headingFamily: 'Fraunces',
      bodyFamily: 'Geist',
    });
    expect(Buffer.compare(deflt, branded)).not.toBe(0);
  });
});
