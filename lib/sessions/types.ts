export type StageType =
  | 'skill_building'
  | 'individual_model'
  | 'shared_model'
  | 'system_model'
  | 'guiding_principles';

export type SessionMode = 'sync' | 'async' | 'hybrid';

export type SessionStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'archived';

export const SESSION_MODES: SessionMode[] = ['sync', 'async', 'hybrid'];

export const SESSION_STATUSES: SessionStatus[] = [
  'draft',
  'scheduled',
  'live',
  'completed',
  'archived',
];

// Stage_type values in their canonical Serious Play order. Both the
// session create action and the integration test harness use this to
// insert the five stage rows in a fresh session.
export const CANONICAL_STAGE_TYPES: StageType[] = [
  'skill_building',
  'individual_model',
  'shared_model',
  'system_model',
  'guiding_principles',
];

export interface StageRow {
  id: string;
  session_id: string;
  stage_type: StageType;
  position: number;
  // Null = use the canonical label / description for the stage_type.
  title: string | null;
  description: string | null;
}

export interface SessionDetail {
  id: string;
  title: string;
  org_id: string;
  // Nullable because deleting the facilitator's account sets this to null
  // (see migration 20260516120000) so prior session history survives.
  facilitator_id: string | null;
}

// The breadcrumb prop shape passed from the design [id] page into the builder.
export interface SessionContext {
  sessionId: string;
  sessionTitle: string;
  stageType: StageType;
}
