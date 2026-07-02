import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  KeyValue,
  Row,
  Screen,
  SectionLabel,
  Segmented,
  Title,
} from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { entriesRemainingLabel, TICKET_TYPE_LABELS } from '@/domain/tickets';
import { suggestWindow } from '@/domain/fastpass';
import { fastPassTone, shortDate, ticketTone, windowLabel } from '@/domain/format';
import { TicketType } from '@/domain/types';
import { writeTag } from '@/services/nfc';
import { buildTagPayload } from '@/services/signing';
import { colors, radius, space } from '@/theme/colors';

const TYPE_OPTIONS: { label: string; value: TicketType }[] = [
  { label: 'Single', value: 'single-day' },
  { label: 'Multi', value: 'multi-day' },
  { label: 'Annual', value: 'annual-pass' },
  { label: 'VIP', value: 'vip' },
];

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const store = useAppStore();
  const ticket = useAppStore((s) => s.tickets.find((t) => t.id === id));
  const attractions = useAppStore((s) => s.attractions);
  const passes = useAppStore((s) =>
    s.fastPasses.filter((f) => f.ticketId === id),
  );

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ticket?.guestName ?? '');
  const [type, setType] = useState<TicketType>(ticket?.type ?? 'single-day');
  const [from, setFrom] = useState(ticket ? toDateInput(ticket.validFrom) : '');
  const [until, setUntil] = useState(ticket ? toDateInput(ticket.validUntil) : '');
  const [linking, setLinking] = useState(false);
  const [bookAttraction, setBookAttraction] = useState<string | null>(attractions[0]?.id ?? null);

  const enrichedPasses = useMemo(
    () =>
      passes.map((p) => ({
        ...p,
        attractionName: attractions.find((a) => a.id === p.attractionId)?.name ?? 'Unknown',
      })),
    [passes, attractions],
  );

  if (!ticket) {
    return (
      <Screen>
        <EmptyState title="Ticket not found" hint="It may have been deleted." />
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  // `ticket` is guaranteed defined past the guard above; capture it so the
  // narrowing survives into the closures below (TS drops it across awaits).
  const tk = ticket;

  async function provisionTag() {
    setLinking(true);
    try {
      const payload = await writeTag(await buildTagPayload(tk.id));
      store.linkNfc(tk.id, payload.uid);
      Alert.alert(
        payload.simulated ? 'Tag linked (simulated)' : 'Tag written',
        `UID ${payload.uid} is now linked to ${tk.guestName}.`,
      );
    } catch {
      Alert.alert('Write failed', 'Could not write to the tag. Try again.');
    } finally {
      setLinking(false);
    }
  }

  function saveEdits() {
    store.updateTicket(tk.id, {
      guestName: name.trim() || tk.guestName,
      type,
      validFrom: new Date(from).toISOString(),
      validUntil: new Date(until).toISOString(),
    });
    setEditing(false);
  }

  function confirmRevoke() {
    Alert.alert('Revoke ticket?', 'The guest will be denied at all gates.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => store.revokeTicket(tk.id) },
    ]);
  }

  function confirmDelete() {
    Alert.alert('Delete ticket?', 'This permanently removes the ticket and its fast passes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          store.deleteTicket(tk.id);
          router.back();
        },
      },
    ]);
  }

  function book() {
    if (!bookAttraction) return;
    const { windowStart, windowEnd } = suggestWindow();
    const res = store.bookFastPass(tk.id, bookAttraction, windowStart, windowEnd);
    Alert.alert(res.ok ? 'Fast pass booked' : 'Could not book', res.reason);
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>{ticket.guestName}</Title>
        <Badge label={ticket.status} tone={ticketTone(ticket.status)} />
      </Row>

      <Card>
        <KeyValue k="Ticket ID" v={ticket.id} />
        <KeyValue k="Type" v={TICKET_TYPE_LABELS[ticket.type]} />
        <KeyValue k="Valid" v={`${shortDate(ticket.validFrom)} → ${shortDate(ticket.validUntil)}`} />
        <KeyValue k="Entries" v={`${ticket.entriesUsed} used · ${entriesRemainingLabel(ticket)} left`} />
        <KeyValue
          k="NFC tag"
          v={ticket.nfcId ?? 'Not linked'}
          tone={ticket.nfcId ? 'success' : 'warning'}
        />
      </Card>

      <SectionLabel>NFC provisioning</SectionLabel>
      <Card>
        <Text style={styles.help}>
          Write this ticket onto a blank NFC wristband or card. The tag UID is captured and linked
          automatically so the gate scanner recognises the guest.
        </Text>
        <Button
          title={ticket.nfcId ? 'Re-write / re-link tag' : 'Write ticket to tag'}
          onPress={provisionTag}
          loading={linking}
        />
      </Card>

      <SectionLabel>Fast passes</SectionLabel>
      <Card>
        <Text style={styles.label}>Book a return window</Text>
        <View style={styles.chips}>
          {attractions.map((a) => {
            const active = a.id === bookAttraction;
            return (
              <Pressable
                key={a.id}
                onPress={() => setBookAttraction(a.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{a.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button title="Book Fast Pass" variant="secondary" onPress={book} />
      </Card>

      {enrichedPasses.length === 0 ? (
        <EmptyState title="No fast passes yet" />
      ) : (
        enrichedPasses.map((p) => (
          <Card key={p.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.passName}>{p.attractionName}</Text>
              <Badge label={p.status} tone={fastPassTone(p.status)} />
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.meta}>{windowLabel(p.windowStart, p.windowEnd)}</Text>
              {p.status === 'booked' && (
                <Pressable onPress={() => store.cancelFastPass(p.id)}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
              )}
            </Row>
          </Card>
        ))
      )}

      <SectionLabel>Manage</SectionLabel>
      {editing ? (
        <Card>
          <Field label="Guest name" value={name} onChangeText={setName} />
          <Text style={styles.label}>Type</Text>
          <Segmented<TicketType> value={type} onChange={setType} options={TYPE_OPTIONS} />
          <View style={{ height: space.md }} />
          <Field label="Valid from (YYYY-MM-DD)" value={from} onChangeText={setFrom} autoCapitalize="none" />
          <Field label="Valid until (YYYY-MM-DD)" value={until} onChangeText={setUntil} autoCapitalize="none" />
          <Row>
            <Button title="Save" onPress={saveEdits} style={{ flex: 1 }} />
            <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="Edit Ticket" variant="secondary" onPress={() => setEditing(true)} />
      )}

      {ticket.status === 'revoked' ? (
        <Button title="Reactivate" onPress={() => store.reactivateTicket(ticket.id)} />
      ) : (
        <Button title="Revoke Ticket" variant="ghost" onPress={confirmRevoke} />
      )}
      <Button title="Delete Ticket" variant="danger" onPress={confirmDelete} />
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: space.sm },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
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
  passName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
  cancel: { color: colors.danger, fontSize: 14, fontWeight: '700' },
});
