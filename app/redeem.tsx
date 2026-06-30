import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanPad } from '@/components/ScanPad';
import { Badge, Card, KeyValue, Row, Screen, SectionLabel } from '@/components/ui';
import { useAppStore, ScanOutcome } from '@/store/appStore';
import { colors, radius, space } from '@/theme/colors';
import { TagPayload } from '@/services/nfc';

export default function RedeemScreen() {
  const attractions = useAppStore((s) => s.attractions);
  const redeem = useAppStore((s) => s.redeemFastPassByNfc);
  const [attractionId, setAttractionId] = useState<string | null>(
    attractions.find((a) => a.status === 'open')?.id ?? attractions[0]?.id ?? null,
  );
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);

  const selected = attractions.find((a) => a.id === attractionId);

  function handleScan(payload: TagPayload) {
    if (!attractionId || !selected) return;
    setOutcome(redeem(payload.uid, attractionId, selected.name));
  }

  const granted = outcome?.result === 'granted';

  return (
    <Screen>
      <SectionLabel>Select attraction</SectionLabel>
      <View style={styles.chips}>
        {attractions.map((a) => {
          const active = a.id === attractionId;
          return (
            <Pressable
              key={a.id}
              onPress={() => {
                setAttractionId(a.id);
                setOutcome(null);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{a.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <ScanPad onScan={handleScan} label={`Tap pass for ${selected.name}`} />
      )}

      {outcome && (
        <Card
          style={{
            borderColor: granted ? colors.success : colors.danger,
            backgroundColor: granted ? `${colors.success}14` : `${colors.danger}14`,
          }}
        >
          <Row>
            <Ionicons
              name={granted ? 'flash' : 'close-circle'}
              size={32}
              color={granted ? colors.success : colors.danger}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.verdict, { color: granted ? colors.success : colors.danger }]}>
                {granted ? 'Fast Pass Accepted' : 'Not Accepted'}
              </Text>
              <Text style={styles.reason}>{outcome.reason}</Text>
            </View>
          </Row>
          {outcome.ticket && <KeyValue k="Guest" v={outcome.ticket.guestName} />}
          {outcome.fastPass && (
            <Badge
              label={granted ? 'Redeemed just now' : `Pass status: ${outcome.fastPass.status}`}
              tone={granted ? 'success' : 'warning'}
            />
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#0B1026' },
  verdict: { fontSize: 20, fontWeight: '800' },
  reason: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
});
