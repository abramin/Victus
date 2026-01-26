/**
 * ScanlineOverlay creates a subtle ambient animation effect.
 * A low-opacity gradient sweeps vertically across the screen,
 * giving the interface a "living" monitor texture.
 *
 * Uses pure CSS animation for performance (no JS animation loop).
 */
export function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-x-0 h-32 animate-scanline"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
