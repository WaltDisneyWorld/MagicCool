import { Attraction, FastPass, ScanLog, Ticket } from '@/domain/types';
import { DEFAULT_MAX_ENTRIES } from '@/domain/tickets';

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const SEED_ATTRACTIONS: Attraction[] = [
  {
    id: 'attr_galaxy',
    name: 'Galaxy Coaster',
    land: 'Tomorrow Frontier',
    waitTime: 75,
    fastPassCapacityPerHour: 60,
    status: 'open',
    minTier: null,
  },
  {
    id: 'attr_haunt',
    name: 'Haunted Hollow',
    land: 'Mystic Woods',
    waitTime: 40,
    fastPassCapacityPerHour: 45,
    status: 'open',
    minTier: null,
  },
  {
    id: 'attr_splash',
    name: 'Splash Cavern',
    land: 'Lagoon Bay',
    waitTime: 55,
    fastPassCapacityPerHour: 50,
    status: 'open',
    minTier: null,
  },
  {
    id: 'attr_summit',
    name: 'Summit VIP Flyover',
    land: 'Sky Peaks',
    waitTime: 20,
    fastPassCapacityPerHour: 15,
    status: 'open',
    minTier: 'vip',
  },
  {
    id: 'attr_carousel',
    name: 'Wonder Carousel',
    land: 'Main Plaza',
    waitTime: 10,
    fastPassCapacityPerHour: 30,
    status: 'maintenance',
    minTier: null,
  },
];

export const SEED_TICKETS: Ticket[] = [
  {
    id: 'tkt_anna',
    nfcId: '04:A2:3F:1B:88:60:80',
    guestName: 'Anna Rivera',
    type: 'multi-day',
    validFrom: isoDaysFromNow(-1),
    validUntil: isoDaysFromNow(3),
    status: 'active',
    entriesUsed: 1,
    maxEntries: DEFAULT_MAX_ENTRIES['multi-day'],
    createdAt: isoDaysFromNow(-2),
  },
  {
    id: 'tkt_ben',
    nfcId: '04:11:9C:7D:22:60:80',
    guestName: 'Ben Cole',
    type: 'single-day',
    validFrom: isoDaysFromNow(0),
    validUntil: isoDaysFromNow(0),
    status: 'active',
    entriesUsed: 0,
    maxEntries: DEFAULT_MAX_ENTRIES['single-day'],
    createdAt: isoDaysFromNow(-1),
  },
  {
    id: 'tkt_vip',
    nfcId: '04:DE:AD:BE:EF:60:80',
    guestName: 'Carmen Lopez',
    type: 'vip',
    validFrom: isoDaysFromNow(-30),
    validUntil: isoDaysFromNow(335),
    status: 'active',
    entriesUsed: 12,
    maxEntries: null,
    createdAt: isoDaysFromNow(-30),
  },
];

export const SEED_FASTPASSES: FastPass[] = [];

export const SEED_LOGS: ScanLog[] = [];
