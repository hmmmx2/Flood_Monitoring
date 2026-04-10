// ─────────────────────────────────────────────────────────────
// @flood/utils
// Pure utility functions shared across mobile and CRM
// No React / React Native imports — pure TypeScript only
// ─────────────────────────────────────────────────────────────

import type { FloodLevel, AlertSeverity } from '@flood/shared-types';

// ── Flood level helpers ───────────────────────────────────────

export function floodLevelToMeters(level: FloodLevel): number {
  const map: Record<FloodLevel, number> = { 0: 0.0, 1: 1.0, 2: 2.5, 3: 4.0 };
  return map[level];
}

export function floodLevelToLabel(level: FloodLevel): string {
  const map: Record<FloodLevel, string> = {
    0: 'Normal',
    1: 'Watch',
    2: 'Warning',
    3: 'Critical',
  };
  return map[level];
}

export function floodLevelToSeverity(level: FloodLevel): AlertSeverity {
  const map: Record<FloodLevel, AlertSeverity> = {
    0: 'normal',
    1: 'watch',
    2: 'warning',
    3: 'critical',
  };
  return map[level];
}

export function metersToFloodLevel(meters: number): FloodLevel {
  if (meters >= 3.5) return 3;
  if (meters >= 2.0) return 2;
  if (meters >= 0.5) return 1;
  return 0;
}

// ── Geolocation helpers ───────────────────────────────────────

/** Haversine distance between two lat/long points, in kilometres */
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Format km distance for display, e.g. "3.4 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// Kuching city centre reference point
export const KUCHING_LAT = 1.5533;
export const KUCHING_LON = 110.3592;

export function distanceFromKuching(lat: number, lon: number): string {
  const km = haversineKm(KUCHING_LAT, KUCHING_LON, lat, lon);
  return formatDistance(km);
}

// ── Time helpers ──────────────────────────────────────────────

/** Relative time string: "2m ago", "3h ago", "2d ago" */
export function relativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Format timestamp as "02:15 PM" */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Format date as "Apr 09, 2026" */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

/** Format date as "09/04/2026 02:15 PM" */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return `${formatDate(d)} ${formatTime(d)}`;
}

// ── Node status helpers ───────────────────────────────────────

export function nodeStatus(
  isDead: boolean,
  level: FloodLevel
): 'active' | 'warning' | 'inactive' {
  if (isDead) return 'inactive';
  if (level >= 2) return 'warning';
  return 'active';
}

export function dashboardStatus(
  isDead: boolean,
  level: FloodLevel
): 'Normal' | 'Watch' | 'Warning' | 'Critical' | 'Offline' {
  if (isDead) return 'Offline';
  const map: Record<FloodLevel, 'Normal' | 'Watch' | 'Warning' | 'Critical'> = {
    0: 'Normal',
    1: 'Watch',
    2: 'Warning',
    3: 'Critical',
  };
  return map[level];
}

export function waterLevelDisplay(level: FloodLevel): string {
  return `${floodLevelToMeters(level).toFixed(1)}m`;
}

// ── String helpers ────────────────────────────────────────────

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// ── Number helpers ────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
