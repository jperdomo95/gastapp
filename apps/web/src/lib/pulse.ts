/** Runtime Pulse token helpers — for values that can't be baked into Tailwind. */

/** Hues assigned to the system categories (by name). */
export const SYSTEM_CATEGORY_HUES: Record<string, number> = {
  'Food & Dining':   28,
  'Transport':       330,
  'Housing':         200,
  'Utilities':       50,
  'Groceries':       145,
  'Health':          200,
  'Entertainment':   280,
  'Shopping':        280,
  'Travel':          170,
  'Other':           230,
};

/**
 * Hue for a category: the user-picked hex color wins; system categories
 * (color = null) fall back to their named hue, then to 230.
 */
export function catHue(name: string, color?: string | null): number {
  if (color) return parseInt(color.replace('#', ''), 16) % 360;
  return SYSTEM_CATEGORY_HUES[name] ?? 230;
}

type Theme = 'dark' | 'light';

/** Returns the category dot/bar/stroke color for a given hue. */
export function catColor(hue: number, theme: Theme = 'dark'): string {
  return theme === 'light'
    ? `hsl(${hue} 68% 47%)`
    : `hsl(${hue} 85% 65%)`;
}

/** Returns the soft chip/icon-background color for a given hue. */
export function catSoft(hue: number, theme: Theme = 'dark'): string {
  return theme === 'light'
    ? `hsl(${hue} 70% 52% / 0.12)`
    : `hsl(${hue} 70% 60% / 0.18)`;
}

/** Returns the icon/text color to use on top of a catSoft background. */
export function catTint(hue: number, theme: Theme = 'dark'): string {
  return theme === 'light'
    ? `hsl(${hue} 62% 40%)`
    : `hsl(${hue} 85% 72%)`;
}

/** Gradient bar fill: horizontal, two adjacent hue stops. */
export function catGradient(hue: number, theme: Theme = 'dark'): string {
  return `linear-gradient(90deg, ${catColor(hue, theme)}, ${catColor(hue + 18, theme)})`;
}

/** Formats a number as a US dollar amount string (e.g. "1,234.56"). */
export function usd(value: number | string, decimals = 2): string {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Accent gradient as an inline style object (for elements that can't use a CSS class). */
export const accentGradientStyle = {
  background: 'linear-gradient(135deg, var(--pulse-v1), var(--pulse-v2))',
} as const;

/** Glass card inline style. Matches the card() helper from pulse-kit. */
export function glassCardStyle(theme: Theme = 'dark'): React.CSSProperties {
  return theme === 'light'
    ? {
        background: '#ffffff',
        border: '1px solid rgba(24,26,46,0.08)',
        borderRadius: 22,
        boxShadow: '0 8px 24px rgba(24,26,46,0.06), 0 1px 2px rgba(24,26,46,0.04)',
      }
    : {
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 22,
        backdropFilter: 'blur(12px)',
      };
}

// React import needed for CSSProperties type — tree-shaken in prod
import type React from 'react';
