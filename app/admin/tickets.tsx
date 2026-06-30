import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, EmptyState, Field, Row, Screen, Segmented } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { entriesRemainingLabel, TICKET_TYPE_LABELS } from '@/domain/tickets';
import { shortDate, ticketTone } from '@/domain/format';
import { TicketStatus } from '@/domain/types';
import { colors, space } from '@/theme/colors';

type Filter = 'all' | TicketStatus;

export default function TicketsScreen() {
  const tickets = useAppStore((s) => s.tickets);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (!q) return true;
      return (
        t.guestName.toLowerCase().includes(q) ||
        (t.nfcId ?? '').toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [tickets, query, filter]);

  return (
    <Screen>
      <Button title="+ Issue New Ticket" onPress={() => router.push('/ticket/new')} />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Name, tag UID or ID" />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Active', value: 'active' },
          { label: 'Revoked', value: 'revoked' },
          { label: 'Expired', value: 'expired' },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No tickets" hint="Adjust your search or issue a new ticket." />
      ) : (
        filtered.map((t) => (
          <Card key={t.id} onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: t.id } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.name}>{t.guestName}</Text>
              <Badge label={t.status} tone={ticketTone(t.status)} />
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.meta}>{TICKET_TYPE_LABELS[t.type]}</Text>
              <Text style={styles.meta}>{entriesRemainingLabel(t)} entries</Text>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row>
                <Ionicons
                  name={t.nfcId ? 'radio-outline' : 'alert-circle-outline'}
                  size={14}
                  color={t.nfcId ? colors.success : colors.warning}
                />
                <Text style={styles.nfc}>{t.nfcId ?? 'No tag linked'}</Text>
              </Row>
              <Text style={styles.meta}>
                {shortDate(t.validFrom)} → {shortDate(t.validUntil)}
              </Text>
            </Row>
          </Card>
        ))
      )}
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
  nfc: { color: colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
});
