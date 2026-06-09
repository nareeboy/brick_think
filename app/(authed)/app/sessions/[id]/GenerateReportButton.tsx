'use client';

import { useEffect, useState, useTransition } from 'react';

import UpgradeModal from '@/components/billing/UpgradeModal';
import type { BrandProfileSummary } from '@/lib/branding/types';

import { generateSessionReport } from '../report-actions';
import { BrandPickerDialog } from './BrandPickerDialog';

interface Props {
  sessionId: string;
  initialPdfUrl: string | null;
  initialGeneratedAt: string | null;
  initialError?: string;
  canBrand?: boolean;
  brandProfiles?: BrandProfileSummary[];
  fontOptions?: Array<{ key: string; label: string }>;
  rememberedBrandProfileId?: string | null;
}

export default function GenerateReportButton({
  sessionId,
  initialPdfUrl,
  initialGeneratedAt,
  initialError,
  canBrand = false,
  brandProfiles = [],
  fontOptions = [],
  rememberedBrandProfileId = null,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(rememberedBrandProfileId ?? null);
  // Brand the current report was actually generated with (vs. `brandId`, the
  // pending picker selection). Seeds from the session's remembered choice.
  const [generatedBrandId, setGeneratedBrandId] = useState<string | null>(
    rememberedBrandProfileId ?? null,
  );
  // Generation errors raised from inside the brand picker stay in the picker
  // (the row's `error` is for the non-branding direct-generate path).
  const [genError, setGenError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Formatted client-side after mount: `toLocaleString()` resolves in the
  // viewer's locale/timezone, which never matches the server's (Railway = UTC),
  // so formatting during SSR/hydration trips a hydration mismatch. Empty on the
  // server + first client render (they agree → no `<p>`), filled post-mount.
  const [generatedLabel, setGeneratedLabel] = useState<string | null>(null);
  useEffect(() => {
    setGeneratedLabel(generatedAt ? new Date(generatedAt).toLocaleString() : null);
  }, [generatedAt]);

  // Non-branding direct path: generate with whatever brand is remembered.
  function run() {
    setError(null);
    startTransition(async () => {
      const res = await generateSessionReport(sessionId, brandId);
      if (res.ok) {
        setPdfUrl(res.pdfUrl);
        setGeneratedAt(res.generatedAt);
      } else if (res.code === 'upgrade_required') {
        setShowUpgrade(true);
      } else if (res.code === 'no_claude_key') {
        setError('AI report generation is not configured on this server.');
      } else {
        setError(messageForCode(res.code, res.message));
      }
    });
  }

  // Branding path: triggered from the picker with the chosen brand. Errors render
  // inside the picker; on success the picker closes and the row shows the result.
  function generateWithBrand(id: string | null) {
    setGenError(null);
    setBrandId(id);
    startTransition(async () => {
      const res = await generateSessionReport(sessionId, id);
      if (res.ok) {
        setPdfUrl(res.pdfUrl);
        setGeneratedAt(res.generatedAt);
        setGeneratedBrandId(id);
        setShowBrandPicker(false);
      } else if (res.code === 'upgrade_required') {
        setShowBrandPicker(false);
        setShowUpgrade(true);
      } else if (res.code === 'no_claude_key') {
        setGenError('AI report generation is not configured on this server.');
      } else {
        setGenError(messageForCode(res.code, res.message));
      }
    });
  }

  return (
    <>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="PDF session reports"
        sessionId={sessionId}
        // Offer the standard report (€9) and the white-labelled report (€45) as a
        // one-off ladder. full_findings (€60) is omitted — that deliverable isn't built.
        tiers={['session_report', 'client_ready']}
      />
      {canBrand && showBrandPicker ? (
        <BrandPickerDialog
          profiles={brandProfiles}
          fontOptions={fontOptions}
          selectedId={brandId}
          currentPdfUrl={pdfUrl}
          currentBrandId={generatedBrandId}
          generating={pending}
          genError={genError}
          onGenerate={generateWithBrand}
          onClose={pending ? () => {} : () => setShowBrandPicker(false)}
        />
      ) : null}
      {/* `relative` + absolutely-positioned messages keep this column's width equal
          to the button alone. Otherwise a long error/generated-at line would widen
          the flex item and shove the sibling header buttons to the left. */}
      <div className="relative flex flex-col items-end">
        {canBrand ? (
          // The primary button opens the brand picker, which is the generation hub
          // (pick branding → generate, or download the current report).
          <button
            type="button"
            onClick={() => {
              setGenError(null);
              setShowBrandPicker(true);
            }}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98]"
            data-testid="report-button"
          >
            {pdfUrl ? 'Download PDF' : 'Generate report'}
          </button>
        ) : pdfUrl ? (
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Download PDF
            </a>
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {pending ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? 'Generating…' : 'Generate report'}
          </button>
        )}
        {generatedAt || error ? (
          <div className="absolute right-0 top-full z-10 mt-1 flex max-w-[280px] flex-col items-end gap-1 text-right">
            {generatedLabel ? (
              <p className="text-xs text-zinc-500">Generated {generatedLabel}</p>
            ) : null}
            {error ? (
              <p className="text-xs text-red-700" role="status">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function messageForCode(code: string, fallback?: string): string {
  switch (code) {
    case 'session_not_completed':
      return 'End the session first.';
    case 'no_models':
      return 'This session has no models to include.';
    case 'claude_api_error':
      return `Anthropic error: ${fallback ?? 'unknown'}.`;
    case 'render_failed':
      return "Couldn't render the PDF — please contact support.";
    case 'storage_upload_failed':
      return 'Upload failed — try again.';
    case 'upgrade_required':
      return 'Subscribe to generate PDF reports.';
    default:
      return fallback ?? 'Something went wrong.';
  }
}
