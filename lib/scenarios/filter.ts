import type { DurationBucket, Scenario, ScenarioFilter, ScenarioScope } from './types';

export const DURATION_BUCKETS: DurationBucket[] = ['any', 'short', 'medium', 'long'];

export const SCENARIO_SCOPES: ScenarioScope[] = ['all', 'library', 'custom'];

function matchesScope(s: Scenario, scope: ScenarioScope): boolean {
  switch (scope) {
    case 'all':
      return true;
    case 'library':
      return s.is_template;
    case 'custom':
      return !s.is_template;
  }
}

function matchesDuration(minutes: number, bucket: DurationBucket): boolean {
  switch (bucket) {
    case 'any':
      return true;
    case 'short':
      return minutes <= 10;
    case 'medium':
      return minutes > 10 && minutes <= 30;
    case 'long':
      return minutes > 30;
  }
}

function matchesSearch(s: Scenario, q: string): boolean {
  if (q === '') return true;
  const needle = q.toLowerCase();
  if (s.title.toLowerCase().includes(needle)) return true;
  if (s.body.toLowerCase().includes(needle)) return true;
  return s.tags.some((t) => t.toLowerCase().includes(needle));
}

export function filterScenarios(scenarios: Scenario[], filter: ScenarioFilter): Scenario[] {
  return scenarios.filter((s) => {
    if (filter.stage !== 'all' && s.stage_type !== filter.stage) return false;
    if (!matchesScope(s, filter.scope)) return false;
    if (!matchesDuration(s.duration_minutes, filter.duration)) return false;
    if (!matchesSearch(s, filter.search)) return false;
    return true;
  });
}
