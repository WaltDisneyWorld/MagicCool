/** Tiny dependency-free id helpers (no uuid dependency needed). */

function rand(len: number): string {
  const chars = '0123456789ABCDEF';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${rand(4)}`;
}

/** Generates a UID that looks like a 7-byte NFC tag serial. */
export function makeFakeNfcUid(): string {
  return Array.from({ length: 7 }, () => rand(2)).join(':');
}
