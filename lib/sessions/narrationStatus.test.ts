import { describe, it, expect } from 'vitest';

import { deriveRowStatus } from '@/lib/sessions/narrationStatus';

describe('deriveRowStatus', () => {
  it('is idle when not requested and no acks', () => {
    expect(deriveRowStatus(false, [])).toEqual({ kind: 'idle' });
  });

  it('is requested (waiting) when started but no acks yet', () => {
    expect(deriveRowStatus(true, [])).toEqual({ kind: 'requested' });
  });

  it('is requested when the only ack is prompted', () => {
    expect(deriveRowStatus(true, ['prompted'])).toEqual({ kind: 'requested' });
  });

  it('counts active recorders', () => {
    expect(deriveRowStatus(true, ['recording', 'recording', 'prompted'])).toEqual({
      kind: 'recording',
      count: 2,
    });
  });

  it('is saved when every speaker has saved', () => {
    expect(deriveRowStatus(false, ['saved', 'saved'])).toEqual({ kind: 'saved' });
  });

  it('is blocked when a mic was declined and nothing is recording (after stop)', () => {
    expect(deriveRowStatus(false, ['declined'])).toEqual({ kind: 'blocked' });
  });

  it('recording wins over a sibling declined', () => {
    expect(deriveRowStatus(true, ['recording', 'declined'])).toEqual({
      kind: 'recording',
      count: 1,
    });
  });
});
