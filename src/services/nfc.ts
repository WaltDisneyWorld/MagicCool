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

export async function cancel(): Promise<void> {
  const m = await loadNative();
  if (!m) return;
  try {
    await m.default.cancelTechnologyRequest();
  } catch {
    /* ignore */
  }
}
