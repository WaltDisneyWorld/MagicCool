import { Attraction, FastPass, Ticket } from './types';
import { TIER_RANK } from './tickets';

export interface FastPassEvaluation {
  ok: boolean;
  reason: string;
}

/** Whether a ticket is allowed to ride an attraction (tier gating). */
export function meetsTierRequirement(ticket: Ticket, attraction: Attraction): boolean {
  if (!attraction.minTier) return true;
  return TIER_RANK[ticket.type] >= TIER_RANK[attraction.minTier];
}

/**
 * Pure check for redeeming a fast pass at `now`. Looks at window + status.
 */
export function evaluateRedeem(
  pass: FastPass | undefined,
  attraction: Attraction | undefined,
  now: Date = new Date(),
): FastPassEvaluation {
  if (!pass) return { ok: false, reason: 'No fast pass found for this attraction' };
  if (pass.status === 'redeemed') return { ok: false, reason: 'Fast pass already redeemed' };
  if (pass.status === 'cancelled') return { ok: false, reason: 'Fast pass was cancelled' };

  const start = new Date(pass.windowStart);
  const end = new Date(pass.windowEnd);
  if (now < start) {
    return {
      ok: false,
      reason: `Return window opens at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
  }
  if (now > end) return { ok: false, reason: 'Return window has closed' };
  if (attraction && attraction.status !== 'open') {
    return { ok: false, reason: `Attraction is ${attraction.status}` };
  }
  return { ok: true, reason: 'Enjoy the ride — skip the line!' };
}

/** Suggests the next hourly return window for a new booking. */
export function suggestWindow(now: Date = new Date()): { windowStart: string; windowEnd: string } {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}

/** Counts active bookings for an attraction within the same hour window. */
export function bookingsInWindow(
  passes: FastPass[],
  attractionId: string,
  windowStart: string,
): number {
  return passes.filter(
    (p) =>
      p.attractionId === attractionId &&
      p.windowStart === windowStart &&
      (p.status === 'booked' || p.status === 'redeemed'),
  ).length;
}
