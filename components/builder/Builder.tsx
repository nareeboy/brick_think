'use client';

import { useMemo, useRef, useState } from 'react';

import { SaveVersionModal } from './SaveVersionModal';
import { ShareModal } from './ShareModal';
import { VersionHistoryPanel } from './VersionHistoryPanel';

import { BrickCommentIndicator } from './BrickCommentIndicator';
import { BrickReactionChips } from './BrickReactionChips';
import {
  BringInPreviousModelCard,
  BringInPreviousModelProvider,
  BringInPreviousModelReopenButton,
} from './BringInPreviousModelButton';
import { BuilderProvider, useBuilderState } from './builderState';
import { BuilderCanvasLoader } from './canvasLoader';
import { CANVAS_DROP_TARGET, DragPieceProvider } from './dragPiece';
import { LayersPanel } from './LayersPanel';
import { ModelTitle } from './ModelTitle';
import { PeopleHereStrip } from './PeopleHereStrip';
import { PresenceCursors } from './PresenceCursors';
import { SaveStatus } from './SaveStatus';
import { PiecesDrawer } from './PiecesDrawer';
import { ScenarioPanel, type BuilderScenario } from './ScenarioPanel';
import { useBrickComments } from './useBrickComments';
import { useBrickReactions } from './useBrickReactions';
import { useFeedbackVisible } from './useFeedbackVisible';
import { ExportMenu } from '@/components/exports/ExportMenu';
import { FacilitatorNotesButton } from '@/app/(authed)/app/designs/[id]/FacilitatorNotesButton';
import type { CommentRow, ReactionRow } from '@/lib/brickFeedback/loadInitial';
import { usePeerPresence } from '@/lib/yjs/usePeerPresence';
import type { ModelDetail } from '@/lib/models/types';
import type { SessionContext } from '@/lib/sessions/types';
import { BuilderBreadcrumb } from './BuilderBreadcrumb';
import { StageTimerContainer } from '@/components/session/StageTimerContainer';

interface BuilderProps {
  initialModel?: ModelDetail;
  readOnly?: boolean;
  /** True when the model is a room-backed canvas (a shared breakout room). */
  roomBacked?: boolean;
  ownerLabel?: string | null;
  orgId?: string | null;
  sessionContext?: SessionContext | null;
  liveMode?: boolean;
  self?: { userId: string; displayName: string; avatarUrl: string | null } | null;
  colourblindMode?: boolean;
  sourceStageLabel?: string | null;
  alreadyImported?: boolean;
  /** True when the signed-in caller is the parent session's facilitator. */
  isSessionFacilitator?: boolean;
  /** Pre-fetched facilitator notes (server-side); null for everyone else. */
  facilitatorNotes?: string | null;
  /**
   * Pre-fetched reactions for the brick-feedback overlay. Non-null only when
   * the model is room-backed (the affordance is room-scoped). Empty array on
   * a fresh room canvas.
   */
  initialReactions?: ReactionRow[] | null;
  /**
   * Pre-fetched comments for the brick-feedback overlay. Same room-scoping
   * rule as `initialReactions` — non-null only on room-backed canvases.
   */
  initialComments?: CommentRow[] | null;
  /** Caller's profile id; needed to tag "mine" pills. */
  myProfileId?: string | null;
  /**
   * Scenario brief for the stage this canvas belongs to. Null for personal
   * designs and for stages without a picked scenario.
   */
  scenario?: BuilderScenario | null;
}

export function Builder({
  initialModel,
  readOnly = false,
  roomBacked = false,
  ownerLabel = null,
  orgId = null,
  sessionContext = null,
  liveMode = false,
  self = null,
  colourblindMode = false,
  sourceStageLabel = null,
  alreadyImported = false,
  isSessionFacilitator = false,
  facilitatorNotes = null,
  initialReactions = null,
  initialComments = null,
  myProfileId = null,
  scenario = null,
}: BuilderProps) {
  const reactionsEnabled = initialReactions !== null && myProfileId !== null && !!initialModel;
  const commentsEnabled = initialComments !== null && myProfileId !== null && !!initialModel;
  return (
    <BuilderProvider
      readOnly={readOnly}
      liveMode={liveMode}
      sessionId={sessionContext?.sessionId ?? null}
      self={self}
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
      <BringInPreviousModelProvider
        sourceStageLabel={sourceStageLabel}
        alreadyImported={alreadyImported}
      >
        <div className="flex min-h-0 flex-1 flex-col bg-[#FAF7F1] text-zinc-900 md:overflow-hidden">
          <LiveReadOnlyBanner
            ownerLabel={ownerLabel}
            roomBacked={roomBacked}
            sessionContext={sessionContext}
          />
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-3 py-3 md:min-h-0 md:px-5 md:py-5">
            <div className="flex flex-1 flex-col gap-4 md:min-h-0 md:flex-row">
              <UnifiedSidebar
                readOnly={readOnly}
                ownerLabel={ownerLabel}
                sessionContext={sessionContext}
              />
              <CanvasStage
                orgId={orgId}
                colourblindMode={colourblindMode}
                sessionContext={sessionContext}
                isSessionFacilitator={isSessionFacilitator}
                facilitatorNotes={facilitatorNotes}
                reactionsEnabled={reactionsEnabled}
                initialReactions={initialReactions ?? []}
                commentsEnabled={commentsEnabled}
                initialComments={initialComments ?? []}
                myProfileId={myProfileId}
                readOnly={readOnly}
                scenario={scenario}
              />
            </div>
          </div>
        </div>
        <SaveToast />
      </BringInPreviousModelProvider>
    </BuilderProvider>
  );
}

function UnifiedSidebar({
  readOnly,
  ownerLabel,
  sessionContext,
}: {
  readOnly: boolean;
  ownerLabel: string | null;
  sessionContext: SessionContext | null;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-900/10 bg-white transition-[width] duration-200 ease-out ${
        collapsed ? 'md:w-14' : 'md:w-[360px]'
      }`}
    >
      {collapsed ? (
        <div className="hidden items-center justify-center p-2 md:flex">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      ) : null}

      <div className={`flex min-h-0 flex-1 flex-col gap-4 p-5 ${collapsed ? 'md:hidden' : ''}`}>
        {sessionContext ? <BuilderBreadcrumb sessionContext={sessionContext} /> : null}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ModelTitle />
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="hidden h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 md:inline-flex"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
        {sessionContext ? <StageTimerContainer sessionId={sessionContext.sessionId} /> : null}
        <div className="flex items-center justify-between gap-2">
          <SaveStatus />
          <div className="flex items-center gap-2">
            {readOnly ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                Read-only · {ownerLabel ?? 'shared'}
              </span>
            ) : null}
            <HistoryButton />
          </div>
        </div>
        <LayersPanel />
        <BringInPreviousModelReopenButton />
        <SaveBuildButton />
      </div>
    </aside>
  );
}

function SaveBuildButton() {
  const { modelId, groups, bricks, readOnly } = useBuilderState();
  const [open, setOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  if (!modelId) return null;
  if (readOnly) return null;

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

function LiveReadOnlyBanner({
  ownerLabel,
  roomBacked,
  sessionContext,
}: {
  ownerLabel: string | null;
  roomBacked: boolean;
  sessionContext: SessionContext | null;
}) {
  const { readOnly, liveMode } = useBuilderState();
  if (!readOnly || liveMode || !sessionContext) return null;
  return (
    <div
      role="status"
      data-testid="live-readonly-banner"
      className="flex items-center justify-center gap-2 border-b border-zinc-200 bg-emerald-50 px-4 py-1.5 text-[12px] text-zinc-700"
    >
      <span
        role="img"
        aria-label="Live"
        className="inline-block h-2 w-2 rounded-full bg-emerald-500"
      />
      <span>
        {roomBacked
          ? 'Live — viewing the shared room · read-only'
          : `Live — viewing ${ownerLabel ? `${ownerLabel}'s` : "participant's"} model · read-only`}
      </span>
    </div>
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

function CanvasStage({
  orgId,
  colourblindMode = false,
  sessionContext = null,
  isSessionFacilitator = false,
  facilitatorNotes = null,
  reactionsEnabled = false,
  initialReactions = [],
  commentsEnabled = false,
  initialComments = [],
  myProfileId = null,
  readOnly = false,
  scenario = null,
}: {
  orgId: string | null;
  colourblindMode?: boolean;
  sessionContext?: SessionContext | null;
  isSessionFacilitator?: boolean;
  facilitatorNotes?: string | null;
  reactionsEnabled?: boolean;
  initialReactions?: ReactionRow[];
  commentsEnabled?: boolean;
  initialComments?: CommentRow[];
  myProfileId?: string | null;
  readOnly?: boolean;
  scenario?: BuilderScenario | null;
}) {
  const { awareness, selfClientId, view, self, modelId } = useBuilderState();
  const presence = usePeerPresence(awareness, selfClientId, self ?? null);
  const [feedbackVisible, toggleFeedback] = useFeedbackVisible();

  // Chrome buttons sit absolutely positioned in the canvas top-right, laid
  // out right-to-left from a fixed gutter that clears the always-present
  // Pieces button (right-5). `right` is the distance of a button's right
  // edge from the container edge, so each one extends leftward by its own
  // width. We advance a cursor by each button's *real* width (+ gap) rather
  // than a fixed step, so a wide pill — the facilitator Notes button is
  // 132px vs 44px for icon-only chrome — pushes its left neighbour fully
  // clear instead of being overlapped by it. Hidden buttons (Share on
  // legacy org-shared designs is the only case) consume no space, so the
  // remaining buttons slide toward the edge with no gap.
  //
  // Share is shown on every session-scoped design (orgId === null) for
  // both owners and viewers; the ShareModal itself owns who can mint links.
  const showShare = modelId !== null && orgId === null;
  const showExport = modelId !== null;
  const showNotes = isSessionFacilitator && sessionContext !== null;
  const showFeedbackToggle = reactionsEnabled || commentsEnabled;
  const SLOT_BASE = 72; // clears the Pieces button at right-5 + gap
  const SLOT_GAP = 8;
  const ICON_BTN_WIDTH = 44; // h-11 w-11 icon-only chrome
  const NOTES_BTN_WIDTH = 144; // h-11 pill: px-3.5 + 16px icon + gap-2 + "Private Notes" label
  let chromeCursor = SLOT_BASE;
  const placeChrome = (visible: boolean, width: number) => {
    if (!visible) return null;
    const right = chromeCursor;
    chromeCursor += width + SLOT_GAP;
    return right;
  };
  const shareRight = placeChrome(showShare, ICON_BTN_WIDTH);
  const exportRight = placeChrome(showExport, ICON_BTN_WIDTH);
  const notesRight = placeChrome(showNotes, NOTES_BTN_WIDTH);
  const feedbackToggleRight = placeChrome(showFeedbackToggle, ICON_BTN_WIDTH);

  // Live-presence avatar strip sits in the same row as the chrome buttons,
  // just to the left of the leftmost one so it never sits behind them. After
  // placement the cursor is one gap past the leftmost button's left edge, so
  // swap that gap for the wider strip gap.
  const STRIP_GAP = 12;
  const peopleStripRight = chromeCursor - SLOT_GAP + STRIP_GAP;

  return (
    <DragPieceProvider>
      <section
        data-testid="builder-canvas"
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

        <BuilderCanvasLoader colourblindMode={colourblindMode} />

        <PresenceCursors
          awareness={awareness}
          selfClientId={selfClientId}
          pan={view.pan}
          zoom={view.zoom}
        />
        <PeopleHereStrip peers={presence.peers} rightPx={peopleStripRight} />

        {reactionsEnabled && myProfileId && feedbackVisible ? (
          <BrickReactionsLayer
            initialReactions={initialReactions}
            myProfileId={myProfileId}
            disabled={readOnly}
          />
        ) : null}

        {commentsEnabled && myProfileId && feedbackVisible ? (
          <BrickCommentsLayer
            initialComments={initialComments}
            myProfileId={myProfileId}
            disabled={readOnly}
          />
        ) : null}

        {shareRight !== null ? <ShareButton rightPx={shareRight} /> : null}
        {exportRight !== null ? <ExportButton rightPx={exportRight} /> : null}
        {notesRight !== null && sessionContext ? (
          <NotesHeaderButton
            sessionId={sessionContext.sessionId}
            initialValue={facilitatorNotes}
            rightPx={notesRight}
          />
        ) : null}
        {feedbackToggleRight !== null ? (
          <FeedbackToggleButton
            rightPx={feedbackToggleRight}
            visible={feedbackVisible}
            onToggle={toggleFeedback}
          />
        ) : null}
        {scenario ? <ScenarioPanel scenario={scenario} /> : null}
        <PiecesDrawer />
        <BringInPreviousModelCard />
      </section>
    </DragPieceProvider>
  );
}

function NotesHeaderButton({
  sessionId,
  initialValue,
  rightPx,
}: {
  sessionId: string;
  initialValue: string | null;
  rightPx: number;
}) {
  return (
    <div className="absolute top-5 z-30" style={{ right: rightPx }}>
      <FacilitatorNotesButton sessionId={sessionId} initialValue={initialValue} />
    </div>
  );
}

function FeedbackToggleButton({
  rightPx,
  visible,
  onToggle,
}: {
  rightPx: number;
  visible: boolean;
  onToggle: () => void;
}) {
  const label = visible ? 'Hide reactions and comments' : 'Show reactions and comments';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={!visible}
      title={label}
      data-testid="feedback-toggle-button"
      style={{ right: rightPx }}
      className="absolute top-5 z-30 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-zinc-900/10 bg-white/85 text-zinc-700 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur transition-colors hover:bg-white hover:text-zinc-900"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        {!visible ? <line x1="4" y1="20" x2="20" y2="4" /> : null}
      </svg>
    </button>
  );
}

function BrickReactionsLayer({
  initialReactions,
  myProfileId,
  disabled,
}: {
  initialReactions: ReactionRow[];
  myProfileId: string;
  disabled: boolean;
}) {
  const { modelId, bricks, groups, view } = useBuilderState();
  // Hook is mounted unconditionally; when modelId is null (transient on
  // first render) it bails out internally.
  const reactionsByBrick = useBrickReactions(modelId ?? '', initialReactions);

  const groupVisible = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const g of groups) m.set(g.id, g.visible);
    return m;
  }, [groups]);

  if (!modelId) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {bricks.map((b) => {
        if (!b.visible) return null;
        if (groupVisible.get(b.groupId) === false) return null;
        // Anchor screen position to the brick's bottom-center in world space,
        // then offset down a few pixels so the chips sit just below the brick.
        // The chip wrapper applies -translate-x-1/2 to center horizontally on
        // this point. Pan/zoom mirror the canvas math used elsewhere
        // (PresenceCursors, selectionOverlay).
        const left = b.x * view.zoom + view.pan.x;
        const top = (b.y + b.height / 2) * view.zoom + view.pan.y + 4;
        return (
          <BrickReactionChips
            key={b.id}
            modelId={modelId}
            brickId={b.id}
            position={{ left, top }}
            reactions={reactionsByBrick[b.id]}
            myProfileId={myProfileId}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

function BrickCommentsLayer({
  initialComments,
  myProfileId,
  disabled,
}: {
  initialComments: CommentRow[];
  myProfileId: string;
  disabled: boolean;
}) {
  const { modelId, bricks, groups, view } = useBuilderState();
  const commentsByBrick = useBrickComments(modelId ?? '', initialComments);

  const groupVisible = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const g of groups) m.set(g.id, g.visible);
    return m;
  }, [groups]);

  if (!modelId) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {bricks.map((b) => {
        if (!b.visible) return null;
        if (groupVisible.get(b.groupId) === false) return null;
        // Indicator is anchored to the brick's top-right corner in screen
        // space — same pan/zoom math the reaction-chip layer uses, just at a
        // different corner of the brick bounding box.
        const x = b.x * view.zoom + view.pan.x;
        const y = b.y * view.zoom + view.pan.y;
        const width = b.width * view.zoom;
        const height = b.height * view.zoom;
        return (
          <BrickCommentIndicator
            key={b.id}
            modelId={modelId}
            brickId={b.id}
            bounds={{ x, y, width, height }}
            comments={commentsByBrick[b.id]}
            myProfileId={myProfileId}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

function ExportButton({ rightPx }: { rightPx: number }) {
  const { modelId, title, groups, bricks, stage } = useBuilderState();
  const stageRef = useRef<typeof stage>(stage);
  stageRef.current = stage;
  if (!modelId) return null;
  return (
    <div className="absolute top-5 z-30" style={{ right: rightPx }}>
      <ExportMenu
        source={{
          kind: 'stage',
          stageRef,
          canvasState: { groups, bricks },
          title,
        }}
        size="builder"
      />
    </div>
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

function ShareButton({ rightPx }: { rightPx: number }) {
  // Visibility (modelId / readOnly / orgId === null) is decided by the
  // parent CanvasStage so chrome slot indices stay correct; this component
  // just renders the trigger + modal at the assigned offset.
  const { modelId } = useBuilderState();
  const [open, setOpen] = useState(false);
  if (!modelId) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share design"
        title="Share design"
        data-testid="share-button"
        style={{ right: rightPx }}
        className="absolute top-5 z-30 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-zinc-900/10 bg-white/85 text-zinc-700 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur transition-colors hover:bg-white hover:text-zinc-900"
      >
        <ShareIcon className="h-5 w-5" />
      </button>
      <ShareModal modelId={modelId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ShareIcon({ className = '' }: { className?: string }) {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98" />
      <path d="m15.41 6.51-6.82 3.98" />
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
      <VersionHistoryPanel modelId={modelId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
