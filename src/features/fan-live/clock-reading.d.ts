import type { FanMatch } from './types';
export const CLOCK_FRESH_MS: number;
export function fanClockReading(match: FanMatch, ageMs?: number, unavailable?: boolean): { text: string; running: boolean; stale: boolean; label: string };
