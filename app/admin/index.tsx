import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Row, Screen, SectionLabel, Title } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, radius, space } from '@/theme/colors';

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function Stat({ value, label, tint }: { value: string | number; label: string; tint: string }) {
  return (
    <View style={[styles.stat, { borderColor: `${tint}44` }]}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function Dashboard() {
  const { tickets, fastPasses, attractions, scanLogs, logout, resetToSeed } = useAppStore();
  const router = useRouter();

  const stats = useMemo(() => {
    const activeTickets = tickets.filter((t) => t.status === 'active').length;
    const entriesToday = scanLogs.filter(
      (l) => l.type === 'gate-entry' && l.result === 'granted' && isToday(l.timestamp),
    ).length;
    const passesBooked = fastPasses.filter((f) => f.status === 'booked').length;
    const passesRedeemed = fastPasses.filter((f) => f.status === 'redeemed').length;
    const openRides = attractions.filter((a) => a.status === 'open').length;
    const denials = scanLogs.filter((l) => l.result === 'denied' && isToday(l.timestamp)).length;
    return { activeTickets, entriesToday, passesBooked, passesRedeemed, openRides, denials };
  }, [tickets, fastPasses, attractions, scanLogs]);

  const busiest = useMemo(
    () => [...attractions].sort((a, b) => b.waitTime - a.waitTime).slice(0, 3),
    [attractions],
  );

  return (
    <Screen>
      <Title>Park Overview</Title>

      <View style={styles.grid}>
        <Stat value={stats.activeTickets} label="Active tickets" tint={colors.success} />
        <Stat value={stats.entriesToday} label="Entries today" tint={colors.primary} />
        <Stat value={stats.passesBooked} label="Passes booked" tint={colors.accent} />
        <Stat value={stats.passesRedeemed} label="Passes redeemed" tint={colors.success} />
        <Stat value={stats.openRides} label="Open rides" tint={colors.primary} />
        <Stat value={stats.denials} label="Denials today" tint={colors.danger} />
      </View>

      <SectionLabel>Longest waits</SectionLabel>
      {busiest.map((a) => (
        <Card key={a.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.rideName}>{a.name}</Text>
              <Text style={styles.rideLand}>{a.land}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.wait}>{a.waitTime}m</Text>
              <Text style={styles.rideLand}>standby</Text>
            </View>
          </Row>
        </Card>
      ))}

      <SectionLabel>Quick actions</SectionLabel>
      <Button title="Issue New Ticket" onPress={() => router.push('/ticket/new')} />
      <Row>
        <Button
          title="Open Gate Scanner"
          variant="secondary"
          onPress={() => router.push('/scan')}
          style={{ flex: 1 }}
        />
        <Button
          title="Redeem Station"
          variant="secondary"
          onPress={() => router.push('/redeem')}
          style={{ flex: 1 }}
        />
      </Row>

      <SectionLabel>Session</SectionLabel>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <Ionicons name="refresh-circle-outline" size={22} color={colors.textMuted} />
            <Text style={styles.sessionText}>Reset demo data to defaults</Text>
          </Row>
          <Button title="Reset" variant="ghost" onPress={resetToSeed} />
        </Row>
      </Card>
      <Button
        title="Sign Out"
        variant="danger"
        onPress={() => {
          logout();
          router.replace('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    gap: 2,
  },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  rideName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rideLand: { color: colors.textMuted, fontSize: 13 },
  wait: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  sessionText: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
