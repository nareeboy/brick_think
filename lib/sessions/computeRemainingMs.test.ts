import { describe, expect, it } from 'vitest';

import { computeRemainingMs, type StageRuntime } from './computeRemainingMs';

const T0 = Date.parse('2026-05-18T12:00:00Z');

function stage(partial: Partial<StageRuntime> = {}): StageRuntime {
  return {
    status: 'active',
    duration_seconds: 600,
    started_at: new Date(T0).toISOString(),
    paused_at: null,
    total_paused_ms: 0,
    extended_seconds: 0,
    ...partial,
  };
}

describe('computeRemainingMs', () => {
  it('returns full duration when not yet started', () => {
    const s = stage({ status: 'pending', started_at: null });
    expect(computeRemainingMs(s, T0 + 60_000)).toBe(600_000);
  });

  it('decreases linearly while active', () => {
    expect(computeRemainingMs(stage(), T0 + 60_000)).toBe(540_000);
    expect(computeRemainingMs(stage(), T0 + 599_000)).toBe(1_000);
  });

  it('clamps to zero past the deadline', () => {
    expect(computeRemainingMs(stage(), T0 + 700_000)).toBe(0);
  });

  it('freezes while paused (uses paused_at, not now)', () => {
    const s = stage({
      status: 'paused',
      paused_at: new Date(T0 + 200_000).toISOString(),
    });
    // now=400s in, paused at 200s — remaining should be 400s regardless of now.
    expect(computeRemainingMs(s, T0 + 400_000)).toBe(400_000);
    expect(computeRemainingMs(s, T0 + 999_999_000)).toBe(400_000);
  });

  it('accounts for total_paused_ms after a resume', () => {
    const s = stage({ total_paused_ms: 30_000 });
    // 60s elapsed, but 30s of that was paused — effective 30s elapsed.
    expect(computeRemainingMs(s, T0 + 60_000)).toBe(570_000);
  });

  it('includes extended_seconds in total', () => {
    const s = stage({ extended_seconds: 120 });
    expect(computeRemainingMs(s, T0)).toBe(720_000);
  });

  it('returns null when duration_seconds is null', () => {
    const s = stage({ duration_seconds: null });
    expect(computeRemainingMs(s, T0 + 60_000)).toBeNull();
  });
});
