import { Platform } from 'react-native';
import { makeFakeNfcUid } from './id';

/**
 * Thin wrapper around react-native-nfc-manager.
 *
 * The native module is unavailable in Expo Go and on web, so every method
 * degrades gracefully to a *simulation mode* that returns plausible data.
 * This keeps the whole app demoable without an EAS dev build, while real
 * hardware scans light up automatically once the native module is present.
 */

export interface TagPayload {
  /** Hardware serial of the tag (always present on a real read). */
  uid: string;
  /** Decoded NDEF text record, if the tag carried one. */
  text: string | null;
  /** True when produced by the simulator rather than a physical tap. */
  simulated: boolean;
}

type NfcModule = typeof import('react-native-nfc-manager');

let mod: NfcModule | null = null;
let nativeReady = false;

async function loadNative(): Promise<NfcModule | null> {
  if (mod) return mod;
  if (Platform.OS === 'web') return null;
  try {
    // Lazy require so web / Expo Go bundles don't crash on the native module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('react-native-nfc-manager');
    return mod;
  } catch {
    return null;
  }
}

export async function isNfcSupported(): Promise<boolean> {
  const m = await loadNative();
  if (!m) return false;
  try {
    const supported = await m.default.isSupported();
    if (supported && !nativeReady) {
      await m.default.start();
      nativeReady = true;
    }
    return supported;
  } catch {
    return false;
  }
}

function decodeNdefText(m: NfcModule, tag: any): string | null {
  try {
    const record = tag?.ndefMessage?.[0];
    if (!record) return null;
    return m.Ndef.text.decodePayload(record.payload) || null;
  } catch {
    return null;
  }
}

/** Reads a tag. Resolves with a simulated payload when no hardware is present. */
export async function readTag(): Promise<TagPayload> {
  const m = await loadNative();
  const supported = await isNfcSupported();
  if (!m || !supported) {
    return { uid: makeFakeNfcUid(), text: null, simulated: true };
  }
  try {
    await m.default.requestTechnology(m.NfcTech.Ndef);
    const tag = await m.default.getTag();
    const uid = (tag?.id ?? '').toString().toUpperCase() || makeFakeNfcUid();
    const text = decodeNdefText(m, tag);
    return { uid, text, simulated: false };
  } finally {
    try {
      await m.default.cancelTechnologyRequest();
    } catch {
      /* ignore */
    }
  }
}

/** Writes an NDEF text record to a tag. Returns the tag UID. */
export async function writeTag(text: string): Promise<TagPayload> {
  const m = await loadNative();
  const supported = await isNfcSupported();
  if (!m || !supported) {
    return { uid: makeFakeNfcUid(), text, simulated: true };
  }
  try {
    await m.default.requestTechnology(m.NfcTech.Ndef);
    const tag = await m.default.getTag();
    const bytes = m.Ndef.encodeMessage([m.Ndef.textRecord(text)]);
    if (bytes) {
      await m.default.ndefHandler.writeNdefMessage(bytes);
    }
    const uid = (tag?.id ?? '').toString().toUpperCase() || makeFakeNfcUid();
    return { uid, text, simulated: false };
  } finally {
    try {
      await m.default.cancelTechnologyRequest();
    } catch {
      /* ignore */
    }
  }
}

export interface TagDetails extends TagPayload {
  /** Native tech types reported by the tag (e.g. NfcA, Ndef, MifareUltralight). */
  techTypes: string[];
  /** NDEF capacity in bytes, when the platform reports it. */
  maxSize: number | null;
  /** Whether the tag is currently writable, when the platform reports it. */
  isWritable: boolean | null;
  /** Number of NDEF records on the tag. */
  recordCount: number;
}

/** Deep-reads a tag: UID, tech list, capacity, writability and NDEF text. */
export async function readTagDetails(): Promise<TagDetails> {
  const m = await loadNative();
  const supported = await isNfcSupported();
  if (!m || !supported) {
    return {
      uid: makeFakeNfcUid(),
      text: null,
      simulated: true,
      techTypes: ['NfcA (simulated)', 'Ndef (simulated)'],
      maxSize: 540,
      isWritable: true,
      recordCount: 0,
    };
  }
  try {
    await m.default.requestTechnology(m.NfcTech.Ndef);
    const tag = await m.default.getTag();
    return {
      uid: (tag?.id ?? '').toString().toUpperCase() || makeFakeNfcUid(),
      text: decodeNdefText(m, tag),
      simulated: false,
      techTypes: (tag as any)?.techTypes ?? [],
      maxSize: (tag as any)?.maxSize ?? null,
      isWritable: (tag as any)?.isWritable ?? null,
      recordCount: tag?.ndefMessage?.length ?? 0,
    };
  } finally {
    try {
      await m.default.cancelTechnologyRequest();
    } catch {
      /* ignore */
    }
  }
}

/** Clears a tag by overwriting its NDEF message with a single empty record. */
export async function eraseTag(): Promise<TagPayload> {
  return writeTag('');
}

/**
 * Permanently locks a tag against further writes (irreversible on hardware).
 * Returns the tag UID. In simulation mode this is a no-op that returns a
 * fake UID.
 */
export async function lockTag(): Promise<TagPayload> {
  const m = await loadNative();
  const supported = await isNfcSupported();
  if (!m || !supported) {
    return { uid: makeFakeNfcUid(), text: null, simulated: true };
  }
  try {
    await m.default.requestTechnology(m.NfcTech.Ndef);
    const tag = await m.default.getTag();
    await m.default.ndefHandler.makeReadOnly();
    const uid = (tag?.id ?? '').toString().toUpperCase() || makeFakeNfcUid();
    return { uid, text: decodeNdefText(m, tag), simulated: false };
  } finally {
    try {
      await m.default.cancelTechnologyRequest();
    } catch {
      /* ignore */
    }
  }
}

export async function cancel(): Promise<void> {
  const m = await loadNative();
  if (!m) return;
  try {
    await m.default.cancelTechnologyRequest();
  } catch {
    /* ignore */
  }
}
