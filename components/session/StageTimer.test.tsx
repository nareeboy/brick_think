import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StageTimer } from './StageTimer';

const baseStage = {
  id: 'a',
  session_id: 's',
  stage_type: 'skill_building',
  position: 0,
  title: null,
  description: null,
  duration_seconds: 600,
  started_at: '2026-05-18T12:00:00Z',
  ended_at: null,
  status: 'active' as const,
  paused_at: null,
  total_paused_ms: 0,
  extended_seconds: 0,
};

describe('StageTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:01:00Z')); // 60s elapsed
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders remaining time when active', () => {
    render(<StageTimer stage={baseStage} />);
    expect(screen.getByText('9:00')).toBeTruthy();
  });

  it('shows pause indicator when paused', () => {
    render(
      <StageTimer stage={{ ...baseStage, status: 'paused', paused_at: '2026-05-18T12:00:30Z' }} />,
    );
    expect(screen.getByText(/paused/i)).toBeTruthy();
  });

  it('renders without digits when duration_seconds is null', () => {
    render(<StageTimer stage={{ ...baseStage, duration_seconds: null }} />);
    expect(screen.queryByText(/^\d:\d\d$/)).toBeNull();
    expect(screen.getByText(/live/i)).toBeTruthy();
  });

  it('renders nothing when stage is null', () => {
    const { container } = render(<StageTimer stage={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies urgency styling when remaining < 30s', () => {
    // 600s duration, advance system time to 11:30 → 30s remaining
    vi.setSystemTime(new Date('2026-05-18T12:09:31Z')); // 571s elapsed → 29s remaining
    const { container } = render(<StageTimer stage={baseStage} />);
    expect((container.firstChild as Element)?.className).toContain('border-red-300');
  });
});
