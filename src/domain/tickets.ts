import { Ticket, TicketType } from './types';

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  'single-day': 'Single Day',
  'multi-day': 'Multi-Day',
  'annual-pass': 'Annual Pass',
  vip: 'VIP',
};

/** Default entry allowance per ticket type. null = unlimited. */
export const DEFAULT_MAX_ENTRIES: Record<TicketType, number | null> = {
  'single-day': 1,
  'multi-day': 4,
  'annual-pass': null,
  vip: null,
};

/** Ordering used when an attraction requires a minimum tier. */
export const TIER_RANK: Record<TicketType, number> = {
  'single-day': 0,
  'multi-day': 1,
  'annual-pass': 2,
  vip: 3,
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export interface EntryEvaluation {
  ok: boolean;
  reason: string;
}

/**
 * Pure validation of whether a ticket may pass a gate at `now`.
 * Does not mutate; the store applies the side effects on success.
 */
export function evaluateEntry(ticket: Ticket | undefined, now: Date = new Date()): EntryEvaluation {
  if (!ticket) {
    return { ok: false, reason: 'No ticket linked to this tag' };
  }
  if (ticket.status === 'revoked') {
    return { ok: false, reason: 'Ticket has been revoked' };
  }
  if (ticket.status === 'expired') {
    return { ok: false, reason: 'Ticket has expired' };
  }
  if (ticket.status === 'depleted') {
    return { ok: false, reason: 'No remaining entries on this ticket' };
  }

  const from = startOfDay(new Date(ticket.validFrom));
  const until = endOfDay(new Date(ticket.validUntil));
  if (now < from) {
    return { ok: false, reason: `Ticket not valid until ${from.toLocaleDateString()}` };
  }
  if (now > until) {
    return { ok: false, reason: 'Ticket date range has passed' };
  }

  if (ticket.maxEntries != null && ticket.entriesUsed >= ticket.maxEntries) {
    return { ok: false, reason: 'All entries used' };
  }

  return { ok: true, reason: 'Welcome to the park!' };
}

/** Recomputes a status from the ticket's own data (no I/O). */
export function deriveStatus(ticket: Ticket, now: Date = new Date()): Ticket['status'] {
  if (ticket.status === 'revoked') return 'revoked';
  if (ticket.maxEntries != null && ticket.entriesUsed >= ticket.maxEntries) {
    return 'depleted';
  }
  if (now > endOfDay(new Date(ticket.validUntil))) return 'expired';
  return 'active';
}

export function entriesRemainingLabel(ticket: Ticket): string {
  if (ticket.maxEntries == null) return 'Unlimited';
  return `${Math.max(0, ticket.maxEntries - ticket.entriesUsed)} of ${ticket.maxEntries}`;
}
