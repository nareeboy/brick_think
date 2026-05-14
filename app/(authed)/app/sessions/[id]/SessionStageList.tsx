import Link from 'next/link';

import { stageLabel } from '@/lib/sessions/stage-labels';
import type { StageRow, StageType } from '@/lib/sessions/types';

import { DeleteSessionModelButton } from './DeleteSessionModelButton';
import { StartModelButton } from './StartModelButton';

interface OwnedModelRow {
  id: string;
  title: string;
  updated_at: string;
  stage_id: string;
}

interface SessionStageListProps {
  sessionId: string;
  stages: StageRow[];
  ownedModels: OwnedModelRow[];
}

export function SessionStageList({
  sessionId,
  stages,
  ownedModels,
}: SessionStageListProps) {
  const modelByStageId = new Map<string, OwnedModelRow>(
    ownedModels.map((m) => [m.stage_id, m]),
  );

  return (
    <ol className="flex flex-col gap-3" data-testid="session-stage-list">
      {stages.map((stage) => {
        const owned = modelByStageId.get(stage.id);
        return (
          <li
            key={stage.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-900/10 bg-white p-4"
            data-testid={`stage-card-${stage.stage_type as StageType}`}
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Stage {stage.position + 1}
              </p>
              <h2 className="text-[16px] font-semibold tracking-tight text-zinc-950">
                {stageLabel(stage.stage_type as StageType)}
              </h2>
              {owned ? (
                <p className="truncate text-[13px] text-zinc-600">{owned.title}</p>
              ) : (
                <p className="text-[13px] text-zinc-500">No model yet</p>
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
          </li>
        );
      })}
    </ol>
  );
}
