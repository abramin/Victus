/**
 * Neural OS Color System
 *
 * Provides continuous color interpolation for muscle fatigue visualization.
 * Replaces hard 4-state colors with smooth organic gradients.
 */

import type { FatigueStatus } from '../../api/types';

// Color stops for the fatigue spectrum (HSL values)
const COLOR_STOPS = {
  fresh: { h: 234, s: 89, l: 59 }, // Indigo (#4f46e5)
  stimulated: { h: 160, s: 84, l: 39 }, // Emerald (#10b981)
  fatigued: { h: 38, s: 92, l: 50 }, // Amber (#f59e0b)
  overreached: { h: 350, s: 89, l: 60 }, // Rose (#f43f5e)
};

// Skin tone base for realistic rendering
export const SKIN_TONES = {
  light: '#f5ddc4',
  medium: '#d4a574',
  dark: '#8b6914',
};

/**
 * Interpolate between two HSL colors
 */
function lerpHSL(
  from: { h: number; s: number; l: number },
  to: { h: number; s: number; l: number },
  t: number
): { h: number; s: number; l: number } {
  // Handle hue wrap-around (shortest path)
  let hDiff = to.h - from.h;
  if (Math.abs(hDiff) > 180) {
    hDiff = hDiff > 0 ? hDiff - 360 : hDiff + 360;
  }

  return {
    h: (from.h + hDiff * t + 360) % 360,
    s: from.s + (to.s - from.s) * t,
    l: from.l + (to.l - from.l) * t,
  };
}

/**
 * Convert HSL to hex color string
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get muscle color based on fatigue percentage (0-100)
 *
 * Returns a continuous gradient:
 * - 0-25%: Indigo → Emerald (fresh to activated)
 * - 25-50%: Emerald (stimulated zone)
 * - 50-75%: Emerald → Amber (working to worked)
 * - 75-100%: Amber → Rose (fatigued to overreached)
 */
export function getMuscleColor(fatiguePercent: number): string {
  const clamped = Math.max(0, Math.min(100, fatiguePercent));

  let hsl: { h: number; s: number; l: number };

  if (clamped <= 25) {
    // Fresh → Stimulated (indigo → emerald)
    const t = clamped / 25;
    hsl = lerpHSL(COLOR_STOPS.fresh, COLOR_STOPS.stimulated, t);
  } else if (clamped <= 50) {
    // Hold at stimulated (emerald zone)
    const t = (clamped - 25) / 25;
    // Slight variation within the emerald zone
    hsl = {
      h: COLOR_STOPS.stimulated.h + t * 5,
      s: COLOR_STOPS.stimulated.s - t * 5,
      l: COLOR_STOPS.stimulated.l + t * 3,
    };
  } else if (clamped <= 75) {
    // Stimulated → Fatigued (emerald → amber)
    const t = (clamped - 50) / 25;
    hsl = lerpHSL(COLOR_STOPS.stimulated, COLOR_STOPS.fatigued, t);
  } else {
    // Fatigued → Overreached (amber → rose)
    const t = (clamped - 75) / 25;
    hsl = lerpHSL(COLOR_STOPS.fatigued, COLOR_STOPS.overreached, t);
  }

  return hslToHex(hsl.h, hsl.s, hsl.l);
}

/**
 * Get inner glow color (slightly brighter/saturated version of base)
 */
export function getGlowColor(fatiguePercent: number): string {
  const clamped = Math.max(0, Math.min(100, fatiguePercent));

  let hsl: { h: number; s: number; l: number };

  if (clamped <= 25) {
    const t = clamped / 25;
    hsl = lerpHSL(COLOR_STOPS.fresh, COLOR_STOPS.stimulated, t);
  } else if (clamped <= 50) {
    hsl = { ...COLOR_STOPS.stimulated };
  } else if (clamped <= 75) {
    const t = (clamped - 50) / 25;
    hsl = lerpHSL(COLOR_STOPS.stimulated, COLOR_STOPS.fatigued, t);
  } else {
    const t = (clamped - 75) / 25;
    hsl = lerpHSL(COLOR_STOPS.fatigued, COLOR_STOPS.overreached, t);
  }

  // Boost saturation and lightness for glow
  return hslToHex(hsl.h, Math.min(100, hsl.s + 10), Math.min(80, hsl.l + 15));
}

/**
 * Get glow intensity based on fatigue (more intense when fatigued/overreached)
 */
export function getGlowIntensity(fatiguePercent: number): number {
  if (fatiguePercent <= 50) return 0;
  if (fatiguePercent <= 75) return 0.3;
  return 0.6;
}

/**
 * Get radial gradient stops for heatmap effect
 * Center is more saturated, edges fade to blend with body
 */
export function getRadialGradientStops(
  fatiguePercent: number,
  skinTone: keyof typeof SKIN_TONES = 'light'
): { center: string; edge: string } {
  const centerColor = getMuscleColor(fatiguePercent);

  // Edge color blends toward skin tone
  const skin = SKIN_TONES[skinTone];

  return {
    center: centerColor,
    edge: blendColors(centerColor, skin, 0.4), // 40% blend toward skin
  };
}

/**
 * Blend two hex colors
 */
function blendColors(color1: string, color2: string, ratio: number): string {
  const parse = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const c1 = parse(color1);
  const c2 = parse(color2);

  const blend = (a: number, b: number) => Math.round(a + (b - a) * ratio);

  const r = blend(c1.r, c2.r);
  const g = blend(c1.g, c2.g);
  const b = blend(c1.b, c2.b);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get animation parameters based on fatigue status
 */
export function getAnimationParams(fatiguePercent: number): {
  shouldPulse: boolean;
  pulseSpeed: number;
  pulseIntensity: number;
  shouldGlitch: boolean;
} {
  if (fatiguePercent < 60) {
    return {
      shouldPulse: false,
      pulseSpeed: 0,
      pulseIntensity: 0,
      shouldGlitch: false,
    };
  }

  if (fatiguePercent < 85) {
    return {
      shouldPulse: true,
      pulseSpeed: 2, // 2 second cycle
      pulseIntensity: 0.02, // 2% scale variation
      shouldGlitch: false,
    };
  }

  // Overreached state
  return {
    shouldPulse: true,
    pulseSpeed: 1, // Faster pulse
    pulseIntensity: 0.04, // More pronounced
    shouldGlitch: true, // Enable glitch effect
  };
}

/**
 * Map fatigue status to display properties
 */
export function getStatusDisplay(status: FatigueStatus): {
  label: string;
  textColor: string;
  bgColor: string;
} {
  switch (status) {
    case 'fresh':
      return {
        label: 'Fresh',
        textColor: '#818cf8', // Indigo-400
        bgColor: 'rgba(79, 70, 229, 0.1)',
      };
    case 'stimulated':
      return {
        label: 'Stimulated',
        textColor: '#34d399', // Emerald-400
        bgColor: 'rgba(16, 185, 129, 0.1)',
      };
    case 'fatigued':
      return {
        label: 'Fatigued',
        textColor: '#fbbf24', // Amber-400
        bgColor: 'rgba(245, 158, 11, 0.1)',
      };
    case 'overreached':
      return {
        label: 'Overreached',
        textColor: '#fb7185', // Rose-400
        bgColor: 'rgba(244, 63, 94, 0.1)',
      };
    default:
      return {
        label: 'Unknown',
        textColor: '#94a3b8',
        bgColor: 'rgba(148, 163, 184, 0.1)',
      };
  }
}
