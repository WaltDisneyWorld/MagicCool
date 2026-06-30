import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { isNfcSupported, readTag, TagPayload } from '@/services/nfc';
import { colors, radius, space } from '@/theme/colors';

export function ScanPad({
  onScan,
  label = 'Tap to scan ticket',
}: {
  onScan: (payload: TagPayload) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [hasNfc, setHasNfc] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isNfcSupported().then((s) => active && setHasNfc(s));
    return () => {
      active = false;
    };
  }, []);

  async function handlePress() {
    if (busy) return;
    setBusy(true);
    try {
      const payload = await readTag();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      onScan(payload);
    } catch {
      // user cancelled or read error — swallow; UI stays ready
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        disabled={busy}
        style={({ pressed }) => [styles.pad, pressed && styles.padPressed]}
      >
        {busy ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Ionicons name="wifi" size={64} color={colors.primary} style={styles.icon} />
        )}
        <Text style={styles.label}>{busy ? 'Hold tag near device…' : label}</Text>
      </Pressable>
      {hasNfc === false && (
        <View style={styles.simBanner}>
          <Ionicons name="information-circle" size={16} color={colors.warning} />
          <Text style={styles.simText}>
            Simulation mode — no NFC hardware detected. Taps generate a demo tag.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  pad: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    paddingVertical: space.xxl + space.lg,
    alignItems: 'center',
    gap: space.md,
  },
  padPressed: { borderColor: colors.primary, backgroundColor: colors.bgElevated },
  icon: { transform: [{ rotate: '90deg' }] },
  label: { color: colors.text, fontSize: 17, fontWeight: '700' },
  simBanner: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    backgroundColor: `${colors.warning}1A`,
    borderColor: `${colors.warning}44`,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  simText: { color: colors.warning, fontSize: 13, flex: 1 },
});
