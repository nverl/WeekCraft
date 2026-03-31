/**
 * Pure date/week utility functions — no store imports.
 * All "week" concepts in KitchenFlow use Monday as the first day.
 */

/** Returns a new Date set to Monday 00:00:00 local time of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, …
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ISO string of the Monday for a given date. */
export function getWeekStartISO(date: Date): string {
  return getWeekStart(date).toISOString();
}

/**
 * Returns 7 Date objects (Mon–Sun) for the week starting at `weekStartISO`.
 * `weekStartISO` should be a full ISO string such as "2026-03-23T00:00:00.000Z".
 */
export function getWeekDates(weekStartISO: string): Date[] {
  const monday = new Date(weekStartISO);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * Returns all week-start ISO strings (Mondays) that appear in the given month.
 * A week "appears" if ANY of its Mon–Sun days fall within the target month.
 * `month` is 0-indexed (JS convention: 0 = January).
 */
export function getMonthWeeks(year: number, month: number): string[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0); // last day of month
  const firstMonday = getWeekStart(firstDay);
  const weeks: string[] = [];
  const cursor = new Date(firstMonday);
  while (cursor <= lastDay) {
    weeks.push(cursor.toISOString());
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

/**
 * Formats a weekStart ISO string to a human-readable range label.
 * Example: "Mar 23 – Mar 29" or "Mar 30 – Apr 5"
 */
export function formatWeekRange(weekStartISO: string): string {
  const days = getWeekDates(weekStartISO);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(days[0])} – ${fmt(days[6])}`;
}

/**
 * Parses an ISO 8601 duration string to total minutes.
 * Examples: "PT30M" → 30, "PT1H30M" → 90, "PT1H" → 60
 */
export function parseISOToMins(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + minutes;
}

/**
 * Returns "Mon 23", "Tue 24", etc. for a day cell label.
 */
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function formatDayCell(date: Date): { short: string; num: number; month: string } {
  // getDay() returns 0 = Sun; adjust to Monday-first index
  const jsDay = date.getDay();
  const moIdx = jsDay === 0 ? 6 : jsDay - 1;
  return {
    short: DAY_SHORT[moIdx],
    num: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
  };
}

/** Returns the next Monday from today (or today if today is Monday). */
export function getNextMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7 || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Parse ISO 8601 duration to a human-readable string.
 * Examples: "PT30M" → "30 min", "PT1H30M" → "1h 30min", "PT2H" → "2h"
 */
export function parseISODuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h`;
  return `${minutes} min`;
}

import type { SelectedExtra } from '@/app/types';

/**
 * Normalise a SelectedExtra value that may be a legacy plain string (id only)
 * or the current `{ id, qty }` object shape.
 */
export function normalizeSelectedExtra(sel: SelectedExtra | string): SelectedExtra {
  if (typeof sel === 'string') return { id: sel, qty: 1 };
  return sel;
}
