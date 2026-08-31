import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { DotGridPlaceholder } from './DotGridPlaceholder';

afterEach(cleanup);

describe('DotGridPlaceholder', () => {
  it('renders the brick-scene SVG on the dot-grid ground', () => {
    render(<DotGridPlaceholder />);
    const placeholder = screen.getByTestId('design-thumb-placeholder');
    const scene = screen.getByTestId('placeholder-brick-scene');
    expect(placeholder.contains(scene)).toBe(true);
    expect(scene.tagName.toLowerCase()).toBe('svg');
    // The dashed "next brick goes here" slot is what makes the scene read as
    // an invitation rather than a finished stack.
    expect(scene.querySelector('[stroke-dasharray]')).not.toBeNull();
  });

  it('stays decorative: hidden from assistive tech, no external requests', () => {
    render(<DotGridPlaceholder />);
    const placeholder = screen.getByTestId('design-thumb-placeholder');
    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
    expect(placeholder.querySelector('img')).toBeNull();
    expect(placeholder.querySelector('image')).toBeNull();
  });
});
