'use client';

import type { Pattern } from '@/lib/bricks/patterns';
import { Circle, Group, Line, Rect } from 'react-konva';

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  pattern: Pattern;
}

const STROKE = 'rgba(0, 0, 0, 0.45)';
const STROKE_WIDTH = 1.5;
const SPACING = 8; // px between stripes / dots

export function BrickPatternOverlay({ x, y, width, height, rotation, pattern }: Props) {
  if (pattern === 'solid') return null;

  return (
    <Group
      x={x}
      y={y}
      offsetX={width / 2}
      offsetY={height / 2}
      rotation={rotation}
      clipX={0}
      clipY={0}
      clipWidth={width}
      clipHeight={height}
      listening={false}
    >
      {renderPattern(pattern, width, height)}
    </Group>
  );
}

function renderPattern(pattern: Pattern, w: number, h: number) {
  switch (pattern) {
    case 'diagonal-up':
      return diagonalLines(w, h, 'up');
    case 'diagonal-down':
      return diagonalLines(w, h, 'down');
    case 'cross-hatch':
      return [...diagonalLines(w, h, 'up'), ...diagonalLines(w, h, 'down')];
    case 'horizontal':
      return horizontalLines(w, h);
    case 'vertical':
      return verticalLines(w, h);
    case 'dots':
      return dots(w, h);
    case 'checker':
      return checker(w, h);
    case 'solid':
      return null;
  }
}

function diagonalLines(w: number, h: number, dir: 'up' | 'down') {
  // 'up' = slope from bottom-left to top-right (positive slope in screen coords means y decreases)
  // We generate lines at every SPACING px along the perpendicular axis.
  const lines: React.ReactElement[] = [];
  const span = w + h;
  for (let i = -h; i < span; i += SPACING) {
    const x1 = i;
    const y1 = dir === 'up' ? h : 0;
    const x2 = i + h;
    const y2 = dir === 'up' ? 0 : h;
    lines.push(
      <Line
        key={`d-${dir}-${i}`}
        points={[x1, y1, x2, y2]}
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
      />,
    );
  }
  return lines;
}

function horizontalLines(w: number, h: number) {
  const lines: React.ReactElement[] = [];
  for (let y = SPACING / 2; y < h; y += SPACING) {
    lines.push(
      <Line key={`h-${y}`} points={[0, y, w, y]} stroke={STROKE} strokeWidth={STROKE_WIDTH} />,
    );
  }
  return lines;
}

function verticalLines(w: number, h: number) {
  const lines: React.ReactElement[] = [];
  for (let x = SPACING / 2; x < w; x += SPACING) {
    lines.push(
      <Line key={`v-${x}`} points={[x, 0, x, h]} stroke={STROKE} strokeWidth={STROKE_WIDTH} />,
    );
  }
  return lines;
}

function dots(w: number, h: number) {
  const result: React.ReactElement[] = [];
  for (let y = SPACING; y < h; y += SPACING) {
    for (let x = SPACING; x < w; x += SPACING) {
      result.push(<Circle key={`dot-${x}-${y}`} x={x} y={y} radius={1.5} fill={STROKE} />);
    }
  }
  return result;
}

function checker(w: number, h: number) {
  const cells: React.ReactElement[] = [];
  const size = SPACING * 1.5;
  for (let row = 0; row * size < h; row++) {
    for (let col = 0; col * size < w; col++) {
      if ((row + col) % 2 === 0) {
        cells.push(
          <Rect
            key={`c-${row}-${col}`}
            x={col * size}
            y={row * size}
            width={size}
            height={size}
            fill={STROKE}
          />,
        );
      }
    }
  }
  return cells;
}

export const __testing = {
  diagonalLines,
  horizontalLines,
  verticalLines,
  dots,
  checker,
  STROKE,
  STROKE_WIDTH,
  SPACING,
};
