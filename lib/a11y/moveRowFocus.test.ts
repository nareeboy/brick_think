// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { moveRowFocus } from './moveRowFocus';

describe('moveRowFocus', () => {
  let panel: HTMLDivElement;
  let rows: HTMLDivElement[];

  beforeEach(() => {
    panel = document.createElement('div');
    panel.setAttribute('data-testid', 'layers-panel');

    // Build three focusable rows inside the panel.
    rows = ['row-0', 'row-1', 'row-2'].map((id) => {
      const div = document.createElement('div');
      div.setAttribute('role', 'button');
      div.setAttribute('tabindex', '0');
      div.id = id;
      panel.appendChild(div);
      return div;
    });

    document.body.appendChild(panel);
  });

  afterEach(() => {
    panel.remove();
  });

  it('moves focus to the next row when dir is "down"', () => {
    rows[1]!.focus();
    moveRowFocus(rows[1]!, 'down');
    expect(document.activeElement).toBe(rows[2]);
  });

  it('moves focus to the previous row when dir is "up"', () => {
    rows[1]!.focus();
    moveRowFocus(rows[1]!, 'up');
    expect(document.activeElement).toBe(rows[0]);
  });

  it('does nothing when already at the first row and dir is "up"', () => {
    rows[0]!.focus();
    moveRowFocus(rows[0]!, 'up');
    // No row before index 0 — focus stays on rows[0].
    expect(document.activeElement).toBe(rows[0]);
  });

  it('does nothing when already at the last row and dir is "down"', () => {
    rows[2]!.focus();
    moveRowFocus(rows[2]!, 'down');
    // No row after the last — focus stays on rows[2].
    expect(document.activeElement).toBe(rows[2]);
  });

  it('falls back to the nearest <section> when no layers-panel ancestor exists', () => {
    const section = document.createElement('section');
    const a = document.createElement('div');
    a.setAttribute('role', 'button');
    a.setAttribute('tabindex', '0');
    const b = document.createElement('div');
    b.setAttribute('role', 'button');
    b.setAttribute('tabindex', '0');
    section.appendChild(a);
    section.appendChild(b);
    document.body.appendChild(section);

    a.focus();
    moveRowFocus(a, 'down');
    expect(document.activeElement).toBe(b);

    section.remove();
  });
});
