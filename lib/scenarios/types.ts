import type { StageType } from '@/lib/sessions/types';

export interface Scenario {
  id: string;
  org_id: string | null;
  stage_type: StageType;
  title: string;
  body: string;
  tags: string[];
  duration_minutes: number;
  is_template: boolean;
  created_by: string | null;
  created_at: string;
}

export type DurationBucket = 'any' | 'short' | 'medium' | 'long';

export type ScenarioScope = 'all' | 'library' | 'custom';

export interface ScenarioFilter {
  stage: StageType | 'all';
  duration: DurationBucket;
  search: string;
  scope: ScenarioScope;
}
