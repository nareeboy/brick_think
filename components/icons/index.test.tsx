import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from './index';

afterEach(cleanup);

const ICONS = [
  ['TrashIcon', TrashIcon],
  ['CloseIcon', CloseIcon],
  ['CheckIcon', CheckIcon],
  ['CopyIcon', CopyIcon],
  ['PencilIcon', PencilIcon],
  ['PlusIcon', PlusIcon],
  ['ChevronDownIcon', ChevronDownIcon],
  ['InfoIcon', InfoIcon],
] as const;

describe('shared icons', () => {
  // The set is decorative by contract: every glyph is aria-hidden (consumers
  // supply the accessible name on the button), sized only via className, and
  // drawn on the shared 24×24 viewBox so icons stay interchangeable.
  test.each(ICONS)('%s renders a decorative 24×24 svg sized by className', (_name, Icon) => {
    const { container } = render(<Icon className="h-4 w-4" />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('class')).toBe('h-4 w-4');
    expect(svg?.querySelector('path, rect, circle, line')).not.toBeNull();
  });

  test('className defaults to empty so an unsized icon inherits nothing', () => {
    const { container } = render(<CopyIcon />);
    expect(container.querySelector('svg')?.getAttribute('class')).toBe('');
  });
});
