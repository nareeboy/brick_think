'use client';

import { useState, useTransition } from 'react';

import { generateSessionReport } from '../report-actions';

interface Props {
  sessionId: string;
  initialPdfUrl: string | null;
  initialGeneratedAt: string | null;
  initialError?: string;
}

export default function GenerateReportButton({
  sessionId,
  initialPdfUrl,
  initialGeneratedAt,
  initialError,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await generateSessionReport(sessionId);
      if (res.ok) {
        setPdfUrl(res.pdfUrl);
        setGeneratedAt(res.generatedAt);
      } else if (res.code === 'no_claude_key') {
        setError('You have no Anthropic key yet.');
      } else {
        setError(messageForCode(res.code, res.message));
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? 'Generating…' : 'Generate report'}
        </button>
      )}
      {generatedAt ? (
        <p className="text-xs text-zinc-500">
          Generated {new Date(generatedAt).toLocaleString()}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700" role="status">
          {error}{' '}
          {error.includes('no Anthropic key') ? (
            <a href="/app/account" className="underline">
              Add one
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function messageForCode(code: string, fallback?: string): string {
  switch (code) {
    case 'session_not_completed':
      return 'End the session first.';
    case 'no_models':
      return 'This session has no models to include.';
    case 'decrypt_failed':
      return 'Your stored key can\'t be decrypted (encryption key changed?). Re-paste it on /app/account.';
    case 'claude_api_error':
      return `Anthropic error: ${fallback ?? 'unknown'}.`;
    case 'render_failed':
      return "Couldn't render the PDF — please contact support.";
    case 'storage_upload_failed':
      return 'Upload failed — try again.';
    default:
      return fallback ?? 'Something went wrong.';
  }
}
