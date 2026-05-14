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

export interface StageRow {
  id: string;
  session_id: string;
  stage_type: StageType;
  position: number;
}

export interface SessionDetail {
  id: string;
  title: string;
  org_id: string;
  facilitator_id: string;
}

// The breadcrumb prop shape passed from the design [id] page into the builder.
export interface SessionContext {
  sessionId: string;
  sessionTitle: string;
  stageType: StageType;
}
