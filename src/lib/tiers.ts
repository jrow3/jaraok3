import type { Tier } from './types';

// A brand without a rating ranks as yellow, in the server's search and on the host page.
export const tierOf = (tiers: Record<string, Tier>, tag: string): Tier => tiers[tag] ?? 'yellow';
