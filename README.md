# 🎢 MagicCool — NFC Theme Park System

An [Expo](https://expo.dev) (React Native) app for running an NFC-driven theme
park: tap a wristband or card at the gate to validate admission, tap at an
attraction to redeem a fast pass, and manage everything from a built-in admin
panel.

> Works on iOS, Android and web. NFC hardware is used automatically when
> available; everywhere else the app drops into **simulation mode** so the full
> experience is demoable without an EAS dev build.

---

## ✨ Features

### NFC ticketing
- **Write** a ticket onto a blank NFC tag and capture its UID in one tap.
- **Signed payloads** — tags carry `MC1.<ticketId>.<sig>` (SHA-256 via
  `expo-crypto`), so the gate can flag blank or cloned tags. Optionally
  enforce signatures park-wide from settings.
- **Gate entry scanner** reads a tag, looks up the linked ticket and validates
  date range, status, remaining entries — and, when enabled, the tag
  signature and an **anti-passback** re-entry cooldown — before consuming an
  entry.
- Tag UID ↔ ticket binding, so a lost tag can be re-issued without losing the
  guest record.

### NFC toolkit (admin → NFC tab)
- **Inspect** — deep-read any tag: UID, tech types, capacity, writability,
  NDEF records, signature verification and linked-guest lookup (falls back to
  the signed payload when the UID isn't in the local database).
- **Write** — put arbitrary NDEF text/URLs on tags (maps, promos, souvenirs).
- **Erase** — clear a tag's NDEF payload.
- **Lock** — permanently make a tag read-only (with confirmation).
- **Gate security settings** — toggle signed-tag enforcement and set the
  anti-passback cooldown.

### Fast pass management
- Book hourly **return windows** per attraction with per-window capacity limits.
- **Redeem station**: pick an attraction, tap the guest's tag, and the pass is
  validated against its window + the ride's status, then marked redeemed.
- Tier gating (e.g. VIP-only attractions) and double-booking protection.

### Admin panel
- **Dashboard** — live counts (active tickets, entries today, passes
  booked/redeemed, denials) and longest standby waits.
- **Tickets** — search/filter, issue, edit, revoke/reactivate, delete, and link
  NFC tags.
- **Fast Pass** — park-wide view of every pass with cancel controls.
- **Rides** — adjust live wait times, set status (open/closed/maintenance),
  capacity and add new attractions.
- **Logs** — full audit trail of every gate and fast pass scan.
- PIN-gated access (demo PIN **`1955`**).

---

## 🚀 Getting started

```bash
npm install
npx expo start
```

Then press `w` for web, `i` for iOS simulator, `a` for Android — or scan the QR
code with Expo Go for a quick look (simulation mode).

### Real NFC hardware

`react-native-nfc-manager` needs native code, so NFC scanning requires a
**development build** (not Expo Go):

```bash
npx expo install expo-dev-client
npx eas build --profile development --platform android   # or ios
```

The NFC permission strings and config plugin are already wired up in
`app.json`. On a device with NFC, the scanner pads automatically switch from
simulated taps to real reads.

---

## 🗂️ Project structure

```
app/                     # expo-router routes (file-based)
  index.tsx              # station picker (gate / redeem / admin)
  scan.tsx               # gate entry scanner
  redeem.tsx             # fast pass redeem station
  login.tsx              # admin PIN gate
  admin/                 # tabbed admin panel (auth-guarded)
    index.tsx            #   dashboard
    tickets.tsx          #   ticket list + search
    fastpass.tsx         #   fast pass overview
    attractions.tsx      #   ride management
    nfc.tsx              #   NFC toolkit (inspect/write/erase/lock) + security settings
    logs.tsx             #   scan audit log
  ticket/
    new.tsx              # issue + provision a ticket
    [id].tsx             # ticket detail (NFC, fast passes, edit)
src/
  domain/                # pure types + business rules (no I/O)
    types.ts
    tickets.ts           #   entry validation, tiers
    fastpass.ts          #   redeem windows, capacity
    format.ts            #   display helpers
  services/
    nfc.ts               # react-native-nfc-manager wrapper + simulator
    signing.ts           # signed tag payloads (SHA-256)
    id.ts                # id / fake-UID helpers
  store/
    appStore.ts          # zustand store, persisted to AsyncStorage
    seed.ts              # demo data
  components/            # UI kit + ScanPad
  theme/                 # colors, spacing, radii
```

## 🧠 Architecture notes

- **State** lives in a single [zustand](https://github.com/pmndrs/zustand)
  store persisted to `AsyncStorage`. All NFC-driven flows
  (`recordGateEntry`, `redeemFastPassByNfc`, `bookFastPass`) live there so the
  UI stays thin.
- **Business rules are pure functions** in `src/domain` — easy to unit test and
  reuse on a real backend. Swapping the store's data layer for a REST/GraphQL
  API is the natural next step for multi-device deployments.
- **NFC is isolated** behind `src/services/nfc.ts`, which lazy-loads the native
  module and falls back to a simulator, keeping the bundle safe on web/Expo Go.

## 🔐 Production checklist

- Replace the hard-coded admin PIN with real auth (the `login` action is the
  single integration point).
- Point the store at a shared backend so gates, redeem stations and the admin
  panel see the same data in real time.
- Move the tag-signing secret server-side (`src/services/signing.ts` documents
  this) — sign at provisioning, verify at the gate via API — or use tags with
  on-chip crypto (e.g. NTAG 424 DNA) instead of NDEF text payloads.
