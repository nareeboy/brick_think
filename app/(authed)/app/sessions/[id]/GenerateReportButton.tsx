'use client';

import { useEffect, useState, useTransition } from 'react';

import UpgradeModal from '@/components/billing/UpgradeModal';

import { generateSessionReport } from '../report-actions';

interface Props {
  sessionId: string;
  initialPdfUrl: string | null;
  initialGeneratedAt: string | null;
  initialError?: string;
  canBrand?: boolean;
  brandPresets?: Array<{ id: string; name: string }>;
  rememberedBrandProfileId?: string | null;
}

export default function GenerateReportButton({
  sessionId,
  initialPdfUrl,
  initialGeneratedAt,
  initialError,
  canBrand = false,
  brandPresets = [],
  rememberedBrandProfileId = null,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(rememberedBrandProfileId ?? null);
  const [pending, startTransition] = useTransition();

  // Formatted client-side after mount: `toLocaleString()` resolves in the
  // viewer's locale/timezone, which never matches the server's (Railway = UTC),
  // so formatting during SSR/hydration trips a hydration mismatch. Empty on the
  // server + first client render (they agree → no `<p>`), filled post-mount.
  const [generatedLabel, setGeneratedLabel] = useState<string | null>(null);
  useEffect(() => {
    setGeneratedLabel(generatedAt ? new Date(generatedAt).toLocaleString() : null);
  }, [generatedAt]);

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

  return (
    <>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="PDF session reports"
        sessionId={sessionId}
      />
      {/* `relative` + absolutely-positioned messages keep this column's width equal
          to the button alone. Otherwise a long error/generated-at line would widen
          the flex item and shove the sibling header buttons to the left. */}
      <div className="relative flex flex-col items-end">
        {canBrand && brandPresets.length > 0 ? (
          <label className="mb-1 flex items-center gap-1.5 text-xs text-zinc-600">
            <span>Branding</span>
            <select
              value={brandId ?? ''}
              onChange={(e) => setBrandId(e.target.value || null)}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
            >
              <option value="">BrickThink default</option>
              {brandPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : canBrand ? (
          <a href="/app/account/branding" className="mb-1 text-xs text-zinc-600 underline">
            Create a brand preset
          </a>
        ) : null}
        {pdfUrl ? (
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
