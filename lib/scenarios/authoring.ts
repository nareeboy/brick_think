// Draft validation for custom scenario authoring. Caps mirror the DB CHECK
// constraints in supabase/migrations/20260519140000_scenarios.sql; the tag
// caps are app-level only (tags have no DB CHECK). Lives outside the
// 'use server' actions file because Next.js forbids non-async exports there.

import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';

export const SCENARIO_TITLE_MAX = 120;
export const SCENARIO_BODY_MAX = 4000;
export const SCENARIO_DURATION_MIN = 1;
export const SCENARIO_DURATION_MAX = 240;
export const SCENARIO_TAGS_MAX = 8;
export const SCENARIO_TAG_LEN_MAX = 40;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ScenarioDraftInput {
  stageType: string;
  title: string;
  body: string;
  durationMinutes: number;
  tags: string;
  /** Destination workshop, or null for a personal (creator-only) scenario. */
  orgId: string | null;
}

export interface ScenarioDraft {
  stageType: StageType;
  title: string;
  body: string;
  durationMinutes: number;
  tags: string[];
  orgId: string | null;
}

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const tag = part.trim();
    if (tag === '' || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length === SCENARIO_TAGS_MAX) break;
  }
  return out;
}

export function validateScenarioDraft(
  input: ScenarioDraftInput,
): { ok: true; draft: ScenarioDraft } | { ok: false } {
  if (!(CANONICAL_STAGE_TYPES as readonly string[]).includes(input.stageType)) {
    return { ok: false };
  }
  const title = input.title.trim();
  if (title.length < 1 || title.length > SCENARIO_TITLE_MAX) return { ok: false };
  const body = input.body.trim();
  if (body.length < 1 || body.length > SCENARIO_BODY_MAX) return { ok: false };
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < SCENARIO_DURATION_MIN ||
    input.durationMinutes > SCENARIO_DURATION_MAX
  ) {
    return { ok: false };
  }
  const tags = parseTags(input.tags);
  if (tags.some((t) => t.length > SCENARIO_TAG_LEN_MAX)) return { ok: false };
  if (input.orgId !== null && !UUID_RE.test(input.orgId)) return { ok: false };
  return {
    ok: true,
    draft: {
      stageType: input.stageType as StageType,
      title,
      body,
      durationMinutes: input.durationMinutes,
      tags,
      orgId: input.orgId,
    },
  };
}
