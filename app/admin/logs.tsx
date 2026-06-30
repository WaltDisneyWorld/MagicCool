import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, EmptyState, Row, Screen, Segmented } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { dateTime } from '@/domain/format';
import { ScanType } from '@/domain/types';
import { colors, space } from '@/theme/colors';

type Filter = 'all' | ScanType;

export default function LogsScreen() {
  const scanLogs = useAppStore((s) => s.scanLogs);
  const tickets = useAppStore((s) => s.tickets);
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(
    () =>
      scanLogs
        .filter((l) => filter === 'all' || l.type === filter)
        .slice(0, 200)
        .map((l) => ({
          ...l,
          guest: l.ticketId
            ? tickets.find((t) => t.id === l.ticketId)?.guestName ?? 'Removed ticket'
            : 'Unknown tag',
        })),
    [scanLogs, tickets, filter],
  );

  return (
    <Screen>
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Gate', value: 'gate-entry' },
          { label: 'Fast Pass', value: 'fastpass-redeem' },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="No scans yet" hint="Gate and fast pass scans will appear here." />
      ) : (
        rows.map((l) => {
          const granted = l.result === 'granted';
          return (
            <Card key={l.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row>
                  <Ionicons
                    name={l.type === 'gate-entry' ? 'enter-outline' : 'flash-outline'}
                    size={16}
                    color={colors.textMuted}
                  />
                  <Text style={styles.guest}>{l.guest}</Text>
                </Row>
                <Badge label={l.result} tone={granted ? 'success' : 'danger'} />
              </Row>
              <Text style={styles.reason}>{l.reason}</Text>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.meta}>{l.location}</Text>
                <Text style={styles.meta}>{dateTime(l.timestamp)}</Text>
              </Row>
              <Text style={styles.uid}>{l.nfcId}</Text>
            </Card>
          );
        })
      )}
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  guest: { color: colors.text, fontSize: 15, fontWeight: '700' },
  reason: { color: colors.textMuted, fontSize: 13 },
  meta: { color: colors.textFaint, fontSize: 12 },
  uid: { color: colors.textFaint, fontSize: 11, fontFamily: 'monospace' },
});
