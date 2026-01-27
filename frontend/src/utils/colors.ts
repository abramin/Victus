/**
 * Color utilities for calendar visualizations
 */

/**
 * Interpolates between two RGB colors based on a factor (0-1)
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Converts heatmap intensity (0.0-1.0) to a color from the gradient:
 * Blue (recovery) → Green → Yellow → Orange → Deep Red (max load)
 */
export function getHeatmapColor(intensity: number): string {
  // Clamp intensity to 0-1 range
  const clamped = Math.max(0, Math.min(1, intensity));

  // Color stops
  const colors = [
    { threshold: 0.0, hex: '#3B82F6' }, // Blue - Recovery
    { threshold: 0.2, hex: '#10B981' }, // Green - Moderate
    { threshold: 0.4, hex: '#F59E0B' }, // Yellow - Medium-high
    { threshold: 0.6, hex: '#F97316' }, // Orange - High
    { threshold: 0.8, hex: '#DC2626' }, // Deep Red - Max load
    { threshold: 1.0, hex: '#DC2626' }, // Deep Red - Max load
  ];

  // Find the two color stops to interpolate between
  for (let i = 0; i < colors.length - 1; i++) {
    const current = colors[i];
    const next = colors[i + 1];

    if (clamped >= current.threshold && clamped <= next.threshold) {
      const range = next.threshold - current.threshold;
      const factor = range === 0 ? 0 : (clamped - current.threshold) / range;
      return interpolateColor(current.hex, next.hex, factor);
    }
  }

  // Fallback (should never reach here due to clamping)
  return colors[colors.length - 1].hex;
}

/**
 * Gets heatmap background color with opacity for Tailwind classes
 * Returns a CSS rgba value for inline styles
 */
export function getHeatmapBackground(intensity: number): string {
  const color = getHeatmapColor(intensity);

  // Convert hex to rgba for safe opacity handling
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Return rgba with 10% opacity
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}
