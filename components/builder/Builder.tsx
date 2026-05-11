'use client';

import type { ReactNode } from 'react';

import { BuilderProvider, useBuilderState } from './builderState';
import { BuilderCanvasLoader } from './canvasLoader';
import { CANVAS_DROP_TARGET, DragPieceProvider } from './dragPiece';
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

/* ---------------- Left panel ---------------- */

function LeftPanel({ className = '' }: { className?: string }) {
  return (
    <aside className={`flex min-h-0 flex-col gap-4 ${className}`}>
      <Panel>
        <ModelTitle />
      </Panel>

      <details
        open
        className="group/layers flex min-h-0 shrink-0 flex-col rounded-2xl border border-zinc-900/10 bg-white p-5 open:flex-1"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
          <p className="text-[14px] font-semibold text-zinc-900">Layers</p>
          <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-zinc-500 transition-transform group-open/layers:rotate-0" />
        </summary>

        <div className="relative mt-4 shrink-0">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
            <SearchIcon className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            tabIndex={-1}
            placeholder="Search"
            className="w-full rounded-xl border border-zinc-900/10 bg-zinc-50 py-2 pl-8 pr-3 text-[12px] text-zinc-800 placeholder:text-zinc-500 outline-none focus:border-[#c0613d]/50"
          />
        </div>

        <div className="-mr-2 mt-1 min-h-0 flex-1 overflow-y-auto pr-2">
          <Group title="Constraint cluster" defaultOpen>
            <Layer icon={<SquareGlyph />} label="Brick / 2×4 wall" color="#c0613d" />
            <Layer
              icon={<CircleGlyph />}
              label="Annotation / connection"
              color="#c0613d"
              active
              visibleHint
            />
            <Layer icon={<TriangleGlyph />} label="Connector / joint 1" color="#c0613d" />
            <Layer icon={<TriangleGlyph />} label="Connector / joint 2" color="#c0613d" />
          </Group>

          <Group title="Foundation">
            <Layer icon={<SquareGlyph />} label="Base plate" color="#c0613d" />
            <Layer icon={<SquareGlyph />} label="Corner brace" color="#c0613d" />
          </Group>

          <Group title="Trust bridge">
            <Layer icon={<TriangleGlyph />} label="Span anchor" color="#c0613d" />
            <Layer icon={<CircleGlyph />} label="Cable mount" color="#c0613d" />
          </Group>
        </div>
      </details>

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

/* ---------------- Center stage ---------------- */

function CanvasStage({ className = '' }: { className?: string }) {
  return (
    <DragPieceProvider>
      <section
        data-drop-target={CANVAS_DROP_TARGET}
        className={`relative overflow-hidden rounded-2xl border border-zinc-900/10 bg-[#FBF7F1] ${className}`}
      >
        {/* subtle dot grid background */}
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

        {/* live Konva canvas (renders its own bottom-right zoom toolbar) */}
        <BuilderCanvasLoader />

        <PiecesDrawer />
      </section>
    </DragPieceProvider>
  );
}

function Group({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <details className="group/details mt-3" open={defaultOpen}>
      <summary className="flex w-full cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-zinc-800 hover:bg-zinc-900/5 [&::-webkit-details-marker]:hidden">
        <FolderIcon className="h-3.5 w-3.5 text-[#c0613d]" />
        <span className="flex-1 font-medium">{title}</span>
        <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-zinc-500 transition-transform group-open/details:rotate-0" />
      </summary>
      {children ? <div className="mt-1 space-y-0.5 pl-4">{children}</div> : null}
    </details>
  );
}

function Layer({
  icon,
  label,
  color,
  active,
  visibleHint,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  active?: boolean;
  visibleHint?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${
        active ? 'bg-[#c0613d]/12 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-900/5'
      }`}
    >
      <span className="text-[10px]" style={{ color }}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {visibleHint ? <EyeIcon className="h-3.5 w-3.5 text-zinc-500" /> : null}
    </div>
  );
}

/* ---------------- Icons (inline) ---------------- */

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

function ChevronDown({ className = '' }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon({ className = '' }: { className?: string }) {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function FolderIcon({ className = '' }: { className?: string }) {
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
      <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H3V7Z" />
    </svg>
  );
}

function EyeIcon({ className = '' }: { className?: string }) {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SquareGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CircleGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
      <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function TriangleGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
      <polygon points="6,2 10,10 2,10" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
