// @vitest-environment happy-dom
import { afterEach, describe, expect, test } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { NarrationWaveform } from '@/components/session/NarrationWaveform';

afterEach(() => {
  cleanup();
});

describe('NarrationWaveform', () => {
  test('renders a fixed row of bars with an accessible label', () => {
    const { container, getByLabelText } = render(<NarrationWaveform active={false} />);
    expect(getByLabelText('recording in progress')).toBeTruthy();
    expect(container.querySelectorAll('.bt-wave-bar')).toHaveLength(32);
  });

  test('applies the active modifier only when active', () => {
    const { container, rerender } = render(<NarrationWaveform active={false} />);
    expect(container.querySelectorAll('.bt-wave-bar--active')).toHaveLength(0);

    rerender(<NarrationWaveform active={true} />);
    expect(container.querySelectorAll('.bt-wave-bar--active')).toHaveLength(32);
  });
});
