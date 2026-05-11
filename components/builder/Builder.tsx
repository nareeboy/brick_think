'use client';

import type { ReactNode } from 'react';

import { BuilderProvider, useBuilderState } from './builderState';
import { BuilderCanvasLoader } from './canvasLoader';
import { CANVAS_DROP_TARGET, DragPieceProvider } from './dragPiece';
import { LayersPanel } from './LayersPanel';
import { ModelTitle } from './ModelTitle';
import { PiecesDrawer } from './PiecesDrawer';

interface BuilderProps {
  userBar?: ReactNode;
}

export function Builder({ userBar }: BuilderProps) {
  return (
    <BuilderProvider>
      <div className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900 md:h-[100dvh] md:min-h-0 md:overflow-hidden">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-3 md:h-full md:px-5 md:py-5">
          {userBar}
          <div className="grid flex-1 grid-cols-1 gap-4 md:min-h-0 md:grid-cols-12 md:grid-rows-1">
            <LeftPanel className="md:col-span-3" />
            <CanvasStage className="md:col-span-9" />
          </div>
        </div>
      </div>
      <SaveToast />
    </BuilderProvider>
  );
}

function LeftPanel({ className = '' }: { className?: string }) {
  return (
    <aside className={`flex min-h-0 flex-col gap-4 ${className}`}>
      <Panel>
        <ModelTitle />
      </Panel>
      <LayersPanel />
      <SaveBuildButton />
    </aside>
  );
}

function SaveBuildButton() {
  const { save } = useBuilderState();
  return (
    <button
      type="button"
      onClick={save}
      className="group mt-auto inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#c0613d] py-4 text-[15px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-all hover:bg-[#cf6e47] active:translate-y-[1px]"
    >
      Save build to canvas
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </button>
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

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-900/10 bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

function CanvasStage({ className = '' }: { className?: string }) {
  return (
    <DragPieceProvider>
      <section
        data-drop-target={CANVAS_DROP_TARGET}
        className={`relative overflow-hidden rounded-2xl border border-zinc-900/10 bg-[#FBF7F1] ${className}`}
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

function ArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
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
