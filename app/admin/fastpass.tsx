import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, EmptyState, Row, Screen, Segmented } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { fastPassTone, windowLabel } from '@/domain/format';
import { FastPassStatus } from '@/domain/types';
import { colors, space } from '@/theme/colors';

type Filter = 'all' | FastPassStatus;

export default function FastPassScreen() {
  const fastPasses = useAppStore((s) => s.fastPasses);
  const tickets = useAppStore((s) => s.tickets);
  const attractions = useAppStore((s) => s.attractions);
  const cancelFastPass = useAppStore((s) => s.cancelFastPass);
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    return fastPasses
      .filter((f) => filter === 'all' || f.status === filter)
      .map((f) => ({
        ...f,
        guest: tickets.find((t) => t.id === f.ticketId)?.guestName ?? 'Unknown guest',
        attraction: attractions.find((a) => a.id === f.attractionId)?.name ?? 'Unknown ride',
      }));
  }, [fastPasses, tickets, attractions, filter]);

  const counts = useMemo(
    () => ({
      booked: fastPasses.filter((f) => f.status === 'booked').length,
      redeemed: fastPasses.filter((f) => f.status === 'redeemed').length,
    }),
    [fastPasses],
  );

  return (
    <Screen>
      <Row>
        <View style={[styles.stat, { borderColor: `${colors.accent}44` }]}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{counts.booked}</Text>
          <Text style={styles.statLabel}>Booked</Text>
        </View>
        <View style={[styles.stat, { borderColor: `${colors.success}44` }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{counts.redeemed}</Text>
          <Text style={styles.statLabel}>Redeemed</Text>
        </View>
      </Row>

      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Booked', value: 'booked' },
          { label: 'Redeemed', value: 'redeemed' },
          { label: 'Cancelled', value: 'cancelled' },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No fast passes"
          hint="Book one from a guest's ticket detail screen."
        />
      ) : (
        rows.map((f) => (
          <Card key={f.id} onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: f.ticketId } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.attraction}>{f.attraction}</Text>
              <Badge label={f.status} tone={fastPassTone(f.status)} />
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.guest}>{f.guest}</Text>
              <Text style={styles.window}>{windowLabel(f.windowStart, f.windowEnd)}</Text>
            </Row>
            {f.status === 'booked' && (
              <Pressable onPress={() => cancelFastPass(f.id)} style={styles.cancelBtn}>
                <Text style={styles.cancel}>Cancel pass</Text>
              </Pressable>
            )}
          </Card>
        ))
      )}
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    padding: space.md,
  },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  attraction: { color: colors.text, fontSize: 16, fontWeight: '700' },
  guest: { color: colors.textMuted, fontSize: 14 },
  window: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  cancelBtn: { alignSelf: 'flex-start', marginTop: space.xs },
  cancel: { color: colors.danger, fontSize: 13, fontWeight: '700' },
});
