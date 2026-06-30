// Core domain models for the MagicCool NFC theme park system.

export type TicketType = 'single-day' | 'multi-day' | 'annual-pass' | 'vip';

export type TicketStatus = 'active' | 'expired' | 'revoked' | 'depleted';

export interface Ticket {
  id: string;
  /** UID read from / written to the physical NFC tag. */
  nfcId: string | null;
  guestName: string;
  type: TicketType;
  /** ISO date strings (inclusive). */
  validFrom: string;
  validUntil: string;
  status: TicketStatus;
  /** How many gate entries have been consumed. */
  entriesUsed: number;
  /** Max entries allowed; null = unlimited (annual / vip). */
  maxEntries: number | null;
  notes?: string;
  createdAt: string;
}

export type FastPassStatus = 'booked' | 'redeemed' | 'expired' | 'cancelled';

export interface FastPass {
  id: string;
  ticketId: string;
  attractionId: string;
  /** ISO datetime — start of the return window. */
  windowStart: string;
  /** ISO datetime — end of the return window. */
  windowEnd: string;
  status: FastPassStatus;
  createdAt: string;
  redeemedAt?: string;
}

export type AttractionStatus = 'open' | 'closed' | 'maintenance';

export interface Attraction {
  id: string;
  name: string;
  land: string;
  /** Current standby wait in minutes. */
  waitTime: number;
  /** Fast passes that may be issued per hourly window. */
  fastPassCapacityPerHour: number;
  status: AttractionStatus;
  /** Minimum ticket tier required to ride; null = any. */
  minTier?: TicketType | null;
}

export type ScanType = 'gate-entry' | 'fastpass-redeem';

export type ScanResult = 'granted' | 'denied';

export interface ScanLog {
  id: string;
  type: ScanType;
  ticketId: string | null;
  nfcId: string;
  attractionId?: string;
  result: ScanResult;
  reason: string;
  location: string;
  timestamp: string;
}
