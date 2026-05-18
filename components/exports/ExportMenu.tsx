'use client';

import type Konva from 'konva';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';

import { buildExportFilename } from '@/lib/exports/filename';
import { buildExportEnvelope, renderEnvelopeToBlob } from '@/lib/exports/json';
import type { CanvasState } from '@/lib/models/types';

export type ExportSource =
  | {
      kind: 'stage';
      stageRef: RefObject<Konva.Stage | null>;
      canvasState: CanvasState;
      title: string;
    }
  | { kind: 'modelId'; modelId: string };

export interface ExportMenuProps {
  source: ExportSource;
  size: 'builder' | 'card';
}

type MenuStatus = 'idle' | 'rendering' | 'error';

async function triggerDownload(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so Safari has time to read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function resolveBrickImageAsDataUri(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load brick asset: ${path}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

async function loadPayload(
  source: ExportSource,
): Promise<{ title: string; canvasState: CanvasState }> {
  if (source.kind === 'stage') {
    return { title: source.title, canvasState: source.canvasState };
  }
  const mod = await import('@/app/(authed)/app/my-designs/actions');
  return mod.getModelExportPayload(source.modelId);
}

export function ExportMenu({ source, size }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<MenuStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    firstItemRef.current?.focus();
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handlePng() {
    setOpen(false);
    setStatus('rendering');
    setError(null);
    try {
      const { renderCanvasToPngBlob } = await import('@/lib/exports/png');
      const payload = await loadPayload(source);
      const blob = await renderCanvasToPngBlob({
        canvasState: payload.canvasState,
        stage: source.kind === 'stage' ? (source.stageRef.current ?? undefined) : undefined,
      });
      await triggerDownload(blob, buildExportFilename(payload.title, 'png'));
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  async function handleSvg() {
    setOpen(false);
    setStatus('rendering');
    setError(null);
    try {
      const { renderCanvasToSvgBlob } = await import('@/lib/exports/svg');
      const payload = await loadPayload(source);
      const blob = await renderCanvasToSvgBlob({
        canvasState: payload.canvasState,
        title: payload.title,
        resolveBrickImage: resolveBrickImageAsDataUri,
      });
      await triggerDownload(blob, buildExportFilename(payload.title, 'svg'));
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  async function handleJson() {
    setOpen(false);
    setStatus('rendering');
    setError(null);
    try {
      const payload = await loadPayload(source);
      const env = buildExportEnvelope({ title: payload.title, canvasState: payload.canvasState });
      const blob = renderEnvelopeToBlob(env);
      await triggerDownload(blob, buildExportFilename(payload.title, 'brickthink.json'));
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  const isBuilder = size === 'builder';
  const triggerClass = isBuilder
    ? 'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-zinc-900/10 bg-white/85 text-zinc-700 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur transition-colors hover:bg-white hover:text-zinc-900 disabled:opacity-60'
    : 'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white text-zinc-500 shadow-sm transition-all hover:text-zinc-900 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 disabled:opacity-30';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Download design"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={status === 'rendering'}
        data-testid="export-menu-trigger"
        className={triggerClass}
      >
        <DownloadIcon className={isBuilder ? 'h-5 w-5' : 'h-4 w-4'} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Export design"
          className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
        >
          <MenuItem buttonRef={firstItemRef} label="PNG image" onSelect={handlePng} />
          <MenuItem label="SVG vector" onSelect={handleSvg} />
          <MenuItem label="JSON (re-importable)" onSelect={handleJson} />
        </div>
      ) : null}
      {status === 'error' && error ? (
        <p
          role="alert"
          className="absolute right-0 top-12 z-40 max-w-xs rounded-md bg-red-50 p-2 text-[11px] text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  onSelect,
  buttonRef,
}: {
  label: string;
  onSelect: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center px-4 py-3 text-left text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-[#FAF7F1]"
    >
      {label}
    </button>
  );
}

function DownloadIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
