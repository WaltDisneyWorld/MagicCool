import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanPad } from '@/components/ScanPad';
import { Badge, Card, Row, Screen, SectionLabel, KeyValue } from '@/components/ui';
import { useAppStore, ScanOutcome } from '@/store/appStore';
import { entriesRemainingLabel, TICKET_TYPE_LABELS } from '@/domain/tickets';
import { colors, space } from '@/theme/colors';
import { TagPayload } from '@/services/nfc';

const GATE = 'Main Entrance';

export default function GateScanScreen() {
  const recordGateEntry = useAppStore((s) => s.recordGateEntry);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [simulated, setSimulated] = useState(false);

  async function handleScan(payload: TagPayload) {
    setSimulated(payload.simulated);
    setOutcome(await recordGateEntry(payload.uid, GATE, payload.text));
  }

  const granted = outcome?.result === 'granted';

  return (
    <Screen>
      <ScanPad onScan={handleScan} label="Tap ticket to enter park" />

      {outcome && (
        <Card
          style={{
            borderColor: granted ? colors.success : colors.danger,
            backgroundColor: granted ? `${colors.success}14` : `${colors.danger}14`,
          }}
        >
          <Row>
            <Ionicons
              name={granted ? 'checkmark-circle' : 'close-circle'}
              size={32}
              color={granted ? colors.success : colors.danger}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.verdict, { color: granted ? colors.success : colors.danger }]}>
                {granted ? 'Entry Granted' : 'Entry Denied'}
              </Text>
              <Text style={styles.reason}>{outcome.reason}</Text>
            </View>
          </Row>

          {outcome.ticket && (
            <View style={styles.details}>
              <KeyValue k="Guest" v={outcome.ticket.guestName} />
              <KeyValue k="Ticket" v={TICKET_TYPE_LABELS[outcome.ticket.type]} />
              <KeyValue k="Entries left" v={entriesRemainingLabel(outcome.ticket)} />
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {outcome.signature && (
              <Badge
                label={
                  outcome.signature === 'valid'
                    ? 'Signed tag ✓'
                    : outcome.signature === 'invalid'
                      ? 'Bad signature'
                      : 'Unsigned tag'
                }
                tone={
                  outcome.signature === 'valid'
                    ? 'success'
                    : outcome.signature === 'invalid'
                      ? 'danger'
                      : 'muted'
                }
              />
            )}
            {simulated && <Badge label="Simulated tap" tone="warning" />}
          </View>
        </Card>
      )}

      <SectionLabel>How it works</SectionLabel>
      <Card>
        <Text style={styles.help}>
          1. Guest taps their NFC wristband or card at the gate.{'\n'}
          2. MagicCool reads the tag UID and looks up the linked ticket.{'\n'}
          3. Date range, status and remaining entries are validated.{'\n'}
          4. On success one entry is consumed and the scan is logged.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  verdict: { fontSize: 20, fontWeight: '800' },
  reason: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  details: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  help: { color: colors.textMuted, fontSize: 14, lineHeight: 24 },
});
