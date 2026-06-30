import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Screen, SectionLabel, Segmented, Subtitle } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { DEFAULT_MAX_ENTRIES, TICKET_TYPE_LABELS } from '@/domain/tickets';
import { TicketType } from '@/domain/types';
import { writeTag } from '@/services/nfc';
import { colors, space } from '@/theme/colors';

const TYPE_OPTIONS: { label: string; value: TicketType }[] = [
  { label: 'Single', value: 'single-day' },
  { label: 'Multi', value: 'multi-day' },
  { label: 'Annual', value: 'annual-pass' },
  { label: 'VIP', value: 'vip' },
];

function todayInput(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function NewTicket() {
  const createTicket = useAppStore((s) => s.createTicket);
  const linkNfc = useAppStore((s) => s.linkNfc);
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState<TicketType>('single-day');
  const [from, setFrom] = useState(todayInput(0));
  const [until, setUntil] = useState(todayInput(0));
  const [notes, setNotes] = useState('');
  const [provisioning, setProvisioning] = useState(false);

  async function submit(linkTag: boolean) {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter the guest name.');
      return;
    }
    setProvisioning(linkTag);
    try {
      const ticket = createTicket({
        guestName: name,
        type,
        validFrom: new Date(from).toISOString(),
        validUntil: new Date(until).toISOString(),
        notes: notes.trim() || undefined,
      });

      if (linkTag) {
        const payload = await writeTag(ticket.id);
        linkNfc(ticket.id, payload.uid);
      }
      router.replace({ pathname: '/ticket/[id]', params: { id: ticket.id } });
    } catch {
      Alert.alert('Tag write failed', 'Ticket was created but the tag was not linked.');
    } finally {
      setProvisioning(false);
    }
  }

  const maxEntries = DEFAULT_MAX_ENTRIES[type];

  return (
    <Screen>
      <Subtitle>Issue a ticket, then optionally write it straight to an NFC tag.</Subtitle>

      <Card>
        <Field label="Guest name" value={name} onChangeText={setName} placeholder="e.g. Jamie Park" />

        <Text style={styles.label}>Ticket type</Text>
        <Segmented<TicketType> value={type} onChange={setType} options={TYPE_OPTIONS} />
        <Text style={styles.hint}>
          {TICKET_TYPE_LABELS[type]} ·{' '}
          {maxEntries == null ? 'unlimited entries' : `${maxEntries} entr${maxEntries === 1 ? 'y' : 'ies'}`}
        </Text>

        <View style={{ height: space.md }} />
        <Field label="Valid from (YYYY-MM-DD)" value={from} onChangeText={setFrom} autoCapitalize="none" />
        <Field label="Valid until (YYYY-MM-DD)" value={until} onChangeText={setUntil} autoCapitalize="none" />
        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Accessibility, group, etc."
          multiline
        />
      </Card>

      <SectionLabel>Create</SectionLabel>
      <Button
        title="Create & Write to NFC Tag"
        onPress={() => submit(true)}
        loading={provisioning}
      />
      <Button title="Create Without Tag" variant="secondary" onPress={() => submit(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  hint: { color: colors.textFaint, fontSize: 12, marginTop: 6 },
});
