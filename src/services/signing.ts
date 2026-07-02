import * as Crypto from 'expo-crypto';

/**
 * Signed tag payloads.
 *
 * Tickets are written to NFC tags as `MC1.<ticketId>.<signature>` where the
 * signature is a truncated SHA-256 over a park secret + the ticket id. The
 * gate can then distinguish a provisioned MagicCool tag from a blank or
 * cloned-onto tag even before hitting the database.
 *
 * NOTE: a shared in-app secret is demo-grade — in production the secret must
 * live server-side (sign at provisioning time, verify at the gate via API),
 * or use tags with real crypto (e.g. NTAG 424 DNA).
 */

const PARK_SECRET = 'magiccool-demo-secret-rotate-me';
const PREFIX = 'MC1';

async function signTicketId(ticketId: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${PARK_SECRET}:${ticketId}`,
  );
  return digest.slice(0, 16);
}

/** Builds the NDEF text payload to write onto a ticket tag. */
export async function buildTagPayload(ticketId: string): Promise<string> {
  return `${PREFIX}.${ticketId}.${await signTicketId(ticketId)}`;
}

/**
 * Verifies a tag's text payload. Returns the embedded ticket id when the
 * signature checks out, otherwise null.
 */
export async function verifyTagPayload(text: string): Promise<string | null> {
  const parts = text.trim().split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, ticketId, sig] = parts;
  if (!ticketId || !sig) return null;
  return (await signTicketId(ticketId)) === sig ? ticketId : null;
}

export type SignatureStatus = 'valid' | 'invalid' | 'missing';

/** Convenience: classify a tag's payload against an expected ticket. */
export async function classifyPayload(
  text: string | null,
  expectedTicketId: string,
): Promise<SignatureStatus> {
  if (!text) return 'missing';
  const ticketId = await verifyTagPayload(text);
  return ticketId === expectedTicketId ? 'valid' : 'invalid';
}
