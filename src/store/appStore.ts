import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Attraction,
  FastPass,
  ScanLog,
  ScanResult,
  Ticket,
  TicketType,
} from '@/domain/types';
import { deriveStatus, evaluateEntry, DEFAULT_MAX_ENTRIES } from '@/domain/tickets';
import { evaluateRedeem, meetsTierRequirement, bookingsInWindow } from '@/domain/fastpass';
import { makeId } from '@/services/id';
import {
  SEED_ATTRACTIONS,
  SEED_FASTPASSES,
  SEED_LOGS,
  SEED_TICKETS,
} from './seed';

export interface ScanOutcome {
  result: ScanResult;
  reason: string;
  ticket?: Ticket;
  fastPass?: FastPass;
}

export interface NewTicketInput {
  guestName: string;
  type: TicketType;
  validFrom: string;
  validUntil: string;
  nfcId?: string | null;
  notes?: string;
}

interface AppState {
  tickets: Ticket[];
  fastPasses: FastPass[];
  attractions: Attraction[];
  scanLogs: ScanLog[];
  isAdminAuthed: boolean;

  // ---- auth ----
  login: (pin: string) => boolean;
  logout: () => void;

  // ---- lookups ----
  ticketByNfc: (nfcId: string) => Ticket | undefined;
  ticketById: (id: string) => Ticket | undefined;
  attractionById: (id: string) => Attraction | undefined;

  // ---- ticket management ----
  createTicket: (input: NewTicketInput) => Ticket;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  revokeTicket: (id: string) => void;
  reactivateTicket: (id: string) => void;
  linkNfc: (ticketId: string, nfcId: string) => void;
  deleteTicket: (id: string) => void;

  // ---- attractions ----
  createAttraction: (a: Omit<Attraction, 'id'>) => Attraction;
  updateAttraction: (id: string, patch: Partial<Attraction>) => void;

  // ---- fast passes ----
  bookFastPass: (
    ticketId: string,
    attractionId: string,
    windowStart: string,
    windowEnd: string,
  ) => { ok: boolean; reason: string; pass?: FastPass };
  cancelFastPass: (id: string) => void;

  // ---- scanning (the NFC-driven flows) ----
  recordGateEntry: (nfcId: string, location: string) => ScanOutcome;
  redeemFastPassByNfc: (nfcId: string, attractionId: string, location: string) => ScanOutcome;

  // ---- maintenance ----
  resetToSeed: () => void;
}

function logEntry(log: Omit<ScanLog, 'id' | 'timestamp'>): ScanLog {
  return { ...log, id: makeId('scan'), timestamp: new Date().toISOString() };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tickets: SEED_TICKETS,
      fastPasses: SEED_FASTPASSES,
      attractions: SEED_ATTRACTIONS,
      scanLogs: SEED_LOGS,
      isAdminAuthed: false,

      login: (pin) => {
        const ok = pin === '1955'; // park opening year — change in production
        if (ok) set({ isAdminAuthed: true });
        return ok;
      },
      logout: () => set({ isAdminAuthed: false }),

      ticketByNfc: (nfcId) =>
        get().tickets.find((t) => t.nfcId && t.nfcId.toUpperCase() === nfcId.toUpperCase()),
      ticketById: (id) => get().tickets.find((t) => t.id === id),
      attractionById: (id) => get().attractions.find((a) => a.id === id),

      createTicket: (input) => {
        const ticket: Ticket = {
          id: makeId('tkt'),
          nfcId: input.nfcId ?? null,
          guestName: input.guestName.trim(),
          type: input.type,
          validFrom: input.validFrom,
          validUntil: input.validUntil,
          status: 'active',
          entriesUsed: 0,
          maxEntries: DEFAULT_MAX_ENTRIES[input.type],
          notes: input.notes,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ tickets: [ticket, ...s.tickets] }));
        return ticket;
      },

      updateTicket: (id, patch) =>
        set((s) => ({
          tickets: s.tickets.map((t) => {
            if (t.id !== id) return t;
            const merged = { ...t, ...patch };
            return { ...merged, status: deriveStatus(merged) };
          }),
        })),

      revokeTicket: (id) =>
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === id ? { ...t, status: 'revoked' } : t)),
        })),

      reactivateTicket: (id) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === id ? { ...t, status: deriveStatus({ ...t, status: 'active' }) } : t,
          ),
        })),

      linkNfc: (ticketId, nfcId) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, nfcId: nfcId.toUpperCase() } : t,
          ),
        })),

      deleteTicket: (id) =>
        set((s) => ({
          tickets: s.tickets.filter((t) => t.id !== id),
          fastPasses: s.fastPasses.filter((f) => f.ticketId !== id),
        })),

      createAttraction: (a) => {
        const attraction: Attraction = { ...a, id: makeId('attr') };
        set((s) => ({ attractions: [...s.attractions, attraction] }));
        return attraction;
      },

      updateAttraction: (id, patch) =>
        set((s) => ({
          attractions: s.attractions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      bookFastPass: (ticketId, attractionId, windowStart, windowEnd) => {
        const state = get();
        const ticket = state.ticketById(ticketId);
        const attraction = state.attractionById(attractionId);
        if (!ticket) return { ok: false, reason: 'Ticket not found' };
        if (!attraction) return { ok: false, reason: 'Attraction not found' };
        if (ticket.status === 'revoked' || ticket.status === 'expired') {
          return { ok: false, reason: `Ticket is ${ticket.status}` };
        }
        if (!meetsTierRequirement(ticket, attraction)) {
          return { ok: false, reason: `Requires ${attraction.minTier} tier` };
        }
        const already = state.fastPasses.find(
          (f) =>
            f.ticketId === ticketId &&
            f.attractionId === attractionId &&
            f.status === 'booked',
        );
        if (already) return { ok: false, reason: 'Guest already holds a pass here' };
        if (
          bookingsInWindow(state.fastPasses, attractionId, windowStart) >=
          attraction.fastPassCapacityPerHour
        ) {
          return { ok: false, reason: 'This return window is full' };
        }
        const pass: FastPass = {
          id: makeId('fp'),
          ticketId,
          attractionId,
          windowStart,
          windowEnd,
          status: 'booked',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ fastPasses: [pass, ...s.fastPasses] }));
        return { ok: true, reason: 'Fast pass booked', pass };
      },

      cancelFastPass: (id) =>
        set((s) => ({
          fastPasses: s.fastPasses.map((f) =>
            f.id === id ? { ...f, status: 'cancelled' } : f,
          ),
        })),

      recordGateEntry: (nfcId, location) => {
        const state = get();
        const ticket = state.ticketByNfc(nfcId);
        const evalResult = evaluateEntry(ticket);
        const outcome: ScanOutcome = {
          result: evalResult.ok ? 'granted' : 'denied',
          reason: evalResult.reason,
          ticket,
        };

        set((s) => {
          const tickets = evalResult.ok && ticket
            ? s.tickets.map((t) => {
                if (t.id !== ticket.id) return t;
                const next = { ...t, entriesUsed: t.entriesUsed + 1 };
                return { ...next, status: deriveStatus(next) };
              })
            : s.tickets;
          return {
            tickets,
            scanLogs: [
              logEntry({
                type: 'gate-entry',
                ticketId: ticket?.id ?? null,
                nfcId,
                result: outcome.result,
                reason: outcome.reason,
                location,
              }),
              ...s.scanLogs,
            ],
          };
        });
        return outcome;
      },

      redeemFastPassByNfc: (nfcId, attractionId, location) => {
        const state = get();
        const ticket = state.ticketByNfc(nfcId);
        const attraction = state.attractionById(attractionId);
        const pass = ticket
          ? state.fastPasses.find(
              (f) =>
                f.ticketId === ticket.id &&
                f.attractionId === attractionId &&
                f.status === 'booked',
            )
          : undefined;
        const evalResult = evaluateRedeem(pass, attraction);
        const outcome: ScanOutcome = {
          result: evalResult.ok ? 'granted' : 'denied',
          reason: !ticket ? 'No ticket linked to this tag' : evalResult.reason,
          ticket,
          fastPass: pass,
        };
        if (!ticket) outcome.result = 'denied';

        set((s) => ({
          fastPasses:
            outcome.result === 'granted' && pass
              ? s.fastPasses.map((f) =>
                  f.id === pass.id
                    ? { ...f, status: 'redeemed', redeemedAt: new Date().toISOString() }
                    : f,
                )
              : s.fastPasses,
          scanLogs: [
            logEntry({
              type: 'fastpass-redeem',
              ticketId: ticket?.id ?? null,
              nfcId,
              attractionId,
              result: outcome.result,
              reason: outcome.reason,
              location,
            }),
            ...s.scanLogs,
          ],
        }));
        return outcome;
      },

      resetToSeed: () =>
        set({
          tickets: SEED_TICKETS,
          fastPasses: SEED_FASTPASSES,
          attractions: SEED_ATTRACTIONS,
          scanLogs: SEED_LOGS,
          isAdminAuthed: get().isAdminAuthed,
        }),
    }),
    {
      name: 'magiccool-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        tickets: s.tickets,
        fastPasses: s.fastPasses,
        attractions: s.attractions,
        scanLogs: s.scanLogs,
      }),
    },
  ),
);
