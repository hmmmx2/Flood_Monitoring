// ─────────────────────────────────────────────────────────────
// @flood/ui-tokens
// Design tokens shared across mobile and CRM frontends
// Import only what you need — no side effects
// ─────────────────────────────────────────────────────────────

import type { FloodLevel, AlertSeverity, RiskLevel } from '@flood/shared-types';

// ── Flood level colour palette ────────────────────────────────

export const FLOOD_LEVEL_COLORS: Record<FloodLevel, {
  bg: string;
  text: string;
  border: string;
  label: string;
}> = {
  0: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7', label: 'Normal' },
  1: { bg: '#FFF8E1', text: '#F57F17', border: '#FFE082', label: 'Watch' },
  2: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80', label: 'Warning' },
  3: { bg: '#FFEBEE', text: '#B71C1C', border: '#EF9A9A', label: 'Critical' },
};

export const FLOOD_LEVEL_HEX: Record<FloodLevel, string> = {
  0: '#2E7D32',
  1: '#F57F17',
  2: '#E65100',
  3: '#B71C1C',
};

// Map pin / marker fill colours
export const FLOOD_LEVEL_MAP_COLOR: Record<FloodLevel, string> = {
  0: '#4CAF50',
  1: '#FFC107',
  2: '#FF9800',
  3: '#F44336',
};

// ── Alert severity ────────────────────────────────────────────

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  normal: '#2E7D32',
  watch: '#F57F17',
  warning: '#E65100',
  critical: '#B71C1C',
};

export const SEVERITY_BG: Record<AlertSeverity, string> = {
  normal: '#E8F5E9',
  watch: '#FFF8E1',
  warning: '#FFF3E0',
  critical: '#FFEBEE',
};

// ── Risk zones ────────────────────────────────────────────────

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#4CAF50',
  medium: '#FFC107',
  high: '#FF9800',
  extreme: '#F44336',
};

export const RISK_LEVEL_FILL_OPACITY: Record<RiskLevel, number> = {
  low: 0.15,
  medium: 0.25,
  high: 0.35,
  extreme: 0.45,
};

// ── Brand palette ─────────────────────────────────────────────

export const BRAND = {
  primary: '#1565C0',       // Deep blue — main brand colour
  primaryLight: '#1E88E5',
  primaryDark: '#0D47A1',
  secondary: '#0288D1',     // Lighter blue — accents
  surface: '#FFFFFF',
  background: '#F5F7FA',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
} as const;

// ── Typography scale ──────────────────────────────────────────

export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ── Spacing scale ─────────────────────────────────────────────

export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

// ── Border radius ─────────────────────────────────────────────

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ── Shadow presets ────────────────────────────────────────────

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
