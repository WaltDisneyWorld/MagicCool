import { StatusTone } from '@/theme/colors';
import { Attraction, FastPassStatus, TicketStatus } from './types';

export function ticketTone(status: TicketStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'revoked':
      return 'danger';
    case 'expired':
      return 'muted';
    case 'depleted':
      return 'warning';
  }
}

export function fastPassTone(status: FastPassStatus): StatusTone {
  switch (status) {
    case 'booked':
      return 'primary';
    case 'redeemed':
      return 'success';
    case 'expired':
      return 'muted';
    case 'cancelled':
      return 'danger';
  }
}

export function attractionTone(status: Attraction['status']): StatusTone {
  switch (status) {
    case 'open':
      return 'success';
    case 'closed':
      return 'danger';
    case 'maintenance':
      return 'warning';
  }
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dateTime(iso: string): string {
  return `${shortDate(iso)} · ${timeOfDay(iso)}`;
}

export function windowLabel(start: string, end: string): string {
  return `${timeOfDay(start)} – ${timeOfDay(end)}`;
}
