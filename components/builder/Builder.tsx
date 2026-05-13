'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { SaveVersionModal } from './SaveVersionModal';
import { VersionHistoryPanel } from './VersionHistoryPanel';

import { BuilderProvider, useBuilderState } from './builderState';
import { BuilderCanvasLoader } from './canvasLoader';
import { CANVAS_DROP_TARGET, DragPieceProvider } from './dragPiece';
import { LayersPanel } from './LayersPanel';
import { ModelTitle } from './ModelTitle';
import { SaveStatus } from './SaveStatus';
import { PiecesDrawer } from './PiecesDrawer';
import { BrickGlyph } from './UserBar';
import type { ModelDetail } from '@/lib/models/types';

interface BuilderProps {
  userBar?: ReactNode;
  initialModel?: ModelDetail;
}

export function Builder({ userBar, initialModel }: BuilderProps) {
  return (
    <BuilderProvider
      initial={
        initialModel
          ? {
              modelId: initialModel.id,
              title: initialModel.title,
              canvasState: initialModel.canvas_state,
            }
          : undefined
      }
    >
      <div className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900 md:h-[100dvh] md:min-h-0 md:overflow-hidden">
        <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4 px-3 py-3 md:min-h-0 md:px-5 md:py-5">
          <div className="flex flex-1 flex-col gap-4 md:min-h-0 md:flex-row">
            <UnifiedSidebar footer={userBar} />
            <CanvasStage />
          </div>
        </div>
      </div>
      <SaveToast />
    </BuilderProvider>
  );
}

function UnifiedSidebar({ footer }: { footer?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-900/10 bg-white transition-[width] duration-200 ease-out ${
        collapsed ? 'md:w-14' : 'md:w-[360px]'
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b border-zinc-900/5 p-3 ${
          collapsed ? 'md:flex-col md:gap-1 md:p-2' : ''
        }`}
      >
        <Link
          href="/app/designs"
          aria-label="Back to my designs"
          className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-900/5"
        >
          <BrickGlyph />
          <span
            className={`text-[14px] font-semibold tracking-tight text-zinc-900 ${
              collapsed ? 'md:hidden' : ''
            }`}
          >
            BrickThink
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`hidden h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 md:inline-flex ${
            collapsed ? '' : 'ml-auto'
          }`}
        >
          <ChevronLeft
            className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col gap-4 p-5 ${
          collapsed ? 'md:hidden' : ''
        }`}
      >
        <ModelTitle />
        <div className="flex items-center justify-between gap-2">
          <SaveStatus />
          <HistoryButton />
        </div>
        <LayersPanel />
        <SaveBuildButton />
        {footer ? (
          <div className="border-t border-zinc-900/5 pt-3">{footer}</div>
        ) : null}
      </div>
    </aside>
  );
}

function SaveBuildButton() {
  const { modelId, groups, bricks } = useBuilderState();
  const [open, setOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  if (!modelId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-auto inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#c0613d] py-4 text-[15px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-all hover:bg-[#cf6e47] active:translate-y-[1px]"
      >
        {savedFlash ? 'Version saved' : 'Save version'}
      </button>
      {open ? (
        <SaveVersionModal
          modelId={modelId}
          canvasState={{ groups, bricks }}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2000);
          }}
        />
      ) : null}
    </>
  );
}

function SaveToast() {
  const { toast, dismissToast } = useBuilderState();
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto inline-flex items-center gap-3 rounded-2xl border border-zinc-900/10 bg-white px-4 py-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#c0613d]/12 text-[#c0613d]">
          <CheckIcon className="h-4 w-4" />
        </span>
        <span className="text-[13px] font-medium text-zinc-900">{toast.message}</span>
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss notification"
          className="ml-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900/5 hover:text-zinc-700"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CanvasStage() {
  return (
    <DragPieceProvider>
      <section
        data-drop-target={CANVAS_DROP_TARGET}
        className="relative min-h-[400px] flex-1 overflow-hidden rounded-2xl border border-zinc-900/10 bg-[#FBF7F1] md:min-h-0"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage: 'radial-gradient(rgba(60,30,15,0.10) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(192,97,61,0.06), transparent 55%)',
          }}
        />

        <BuilderCanvasLoader />

        <PiecesDrawer />
      </section>
    </DragPieceProvider>
  );
}

function ChevronLeft({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12 4.5 4.5L20 6.5" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function HistoryButton() {
  const { modelId } = useBuilderState();
  const [open, setOpen] = useState(false);
  if (!modelId) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Version history"
        title="Version history"
        className="inline-flex h-7 cursor-pointer items-center rounded-md px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
      >
        History
      </button>
      <VersionHistoryPanel
        modelId={modelId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
