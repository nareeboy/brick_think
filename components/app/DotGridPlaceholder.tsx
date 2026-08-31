/**
 * Dot-grid stand-in for a design thumbnail that doesn't exist (yet). Shared
 * by the my-designs grid, the workshops list, and the sessions grid so an
 * empty card looks intentional everywhere instead of broken.
 */
export function DotGridPlaceholder() {
  return (
    <div
      aria-hidden="true"
      data-testid="design-thumb-placeholder"
      className="absolute inset-0"
      style={{
        backgroundImage: 'radial-gradient(rgba(60,30,15,0.10) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    />
  );
}
