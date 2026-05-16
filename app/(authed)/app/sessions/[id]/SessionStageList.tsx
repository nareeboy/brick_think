import Link from 'next/link';

import { stageDescription, stageLabel } from '@/lib/sessions/stage-labels';
import type { StageRow, StageType } from '@/lib/sessions/types';

import { DeleteSessionModelButton } from './DeleteSessionModelButton';
import { StartModelButton } from './StartModelButton';

interface OwnedModelRow {
  id: string;
  title: string;
  updated_at: string;
  stage_id: string;
}

// A participant's model shown to facilitators / org admins.
// The caller's own model is rendered separately via the OwnedModelRow path.
export interface ParticipantModel {
  id: string;
  title: string;
  ownerLabel: string;
}

interface SessionStageListProps {
  sessionId: string;
  stages: StageRow[];
  ownedModels: OwnedModelRow[];
  // Empty object when the viewer is a regular participant — they only ever
  // see their own row. Keyed by stage_id when the viewer is facilitator/admin.
  participantsByStage: Record<string, ParticipantModel[]>;
}

export function SessionStageList({
  sessionId,
  stages,
  ownedModels,
  participantsByStage,
}: SessionStageListProps) {
  const modelByStageId = new Map<string, OwnedModelRow>(
    ownedModels.map((m) => [m.stage_id, m]),
  );

  return (
    <ol className="flex flex-col gap-3" data-testid="session-stage-list">
      {stages.map((stage) => {
        const owned = modelByStageId.get(stage.id);
        const participants = participantsByStage[stage.id] ?? [];
        return (
          <li
            key={stage.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-900/10 bg-white p-4"
            data-testid={`stage-card-${stage.stage_type as StageType}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Stage {stage.position + 1}
                </p>
                <h2 className="text-[16px] font-semibold tracking-tight text-zinc-950">
                  {stageLabel(stage.stage_type as StageType)}
                </h2>
                <p className="text-[12px] leading-snug text-zinc-500">
                  {stageDescription(stage.stage_type as StageType)}
                </p>
                {owned ? (
                  <p className="mt-1 truncate text-[13px] text-zinc-600">{owned.title}</p>
                ) : (
                  <p className="mt-1 text-[13px] text-zinc-500">No model yet</p>
                )}
              </div>
              {owned ? (
                <div className="flex items-center gap-1">
                  <DeleteSessionModelButton modelId={owned.id} modelTitle={owned.title} />
                  <Link
                    href={`/app/designs/${owned.id}`}
                    data-testid={`open-model-${stage.stage_type as StageType}`}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
                  >
                    Open
                  </Link>
                </div>
              ) : (
                <StartModelButton sessionId={sessionId} stageId={stage.id} />
              )}
            </div>

            {participants.length > 0 ? (
              <div
                className="border-t border-zinc-900/5 pt-3"
                data-testid={`stage-participants-${stage.stage_type as StageType}`}
              >
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Participants ({participants.length})
                </p>
                <ul className="flex flex-col gap-2">
                  {participants.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3"
                      data-testid={`participant-row-${p.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-zinc-800">
                          {p.title}
                        </p>
                        <p className="truncate text-[12px] text-zinc-500">{p.ownerLabel}</p>
                      </div>
                      <Link
                        href={`/app/designs/${p.id}`}
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
