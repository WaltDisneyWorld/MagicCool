import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  Field,
  Row,
  Screen,
  SectionLabel,
  Segmented,
} from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { attractionTone } from '@/domain/format';
import { AttractionStatus } from '@/domain/types';
import { colors, radius, space } from '@/theme/colors';

const STATUS_OPTIONS: { label: string; value: AttractionStatus }[] = [
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
  { label: 'Maint.', value: 'maintenance' },
];

export default function AttractionsScreen() {
  const attractions = useAppStore((s) => s.attractions);
  const updateAttraction = useAppStore((s) => s.updateAttraction);
  const createAttraction = useAppStore((s) => s.createAttraction);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [land, setLand] = useState('');
  const [wait, setWait] = useState('15');
  const [capacity, setCapacity] = useState('40');

  function addAttraction() {
    if (!name.trim()) return;
    createAttraction({
      name: name.trim(),
      land: land.trim() || 'General',
      waitTime: parseInt(wait, 10) || 0,
      fastPassCapacityPerHour: parseInt(capacity, 10) || 0,
      status: 'open',
      minTier: null,
    });
    setName('');
    setLand('');
    setWait('15');
    setCapacity('40');
    setAdding(false);
  }

  function adjustWait(id: string, current: number, delta: number) {
    updateAttraction(id, { waitTime: Math.max(0, current + delta) });
  }

  return (
    <Screen>
      {adding ? (
        <Card>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Ride name" />
          <Field label="Land / area" value={land} onChangeText={setLand} placeholder="e.g. Lagoon Bay" />
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Wait (min)" value={wait} onChangeText={setWait} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="FP / hour"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
              />
            </View>
          </Row>
          <Row>
            <Button title="Add" onPress={addAttraction} style={{ flex: 1 }} />
            <Button title="Cancel" variant="ghost" onPress={() => setAdding(false)} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="+ Add Attraction" onPress={() => setAdding(true)} />
      )}

      <SectionLabel>{attractions.length} attractions</SectionLabel>

      {attractions.map((a) => (
        <Card key={a.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{a.name}</Text>
              <Text style={styles.land}>{a.land}</Text>
            </View>
            <Badge label={a.status} tone={attractionTone(a.status)} />
          </Row>

          <Row style={{ justifyContent: 'space-between', marginTop: space.xs }}>
            <Text style={styles.metaKey}>Standby wait</Text>
            <Row>
              <Pill icon="remove" onPress={() => adjustWait(a.id, a.waitTime, -5)} />
              <Text style={styles.wait}>{a.waitTime}m</Text>
              <Pill icon="add" onPress={() => adjustWait(a.id, a.waitTime, 5)} />
            </Row>
          </Row>

          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.metaKey}>Fast pass / hour</Text>
            <Text style={styles.metaVal}>{a.fastPassCapacityPerHour}</Text>
          </Row>
          {a.minTier ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.metaKey}>Min tier</Text>
              <Text style={styles.metaVal}>{a.minTier}</Text>
            </Row>
          ) : null}

          <View style={{ marginTop: space.sm }}>
            <Segmented<AttractionStatus>
              value={a.status}
              onChange={(v) => updateAttraction(a.id, { status: v })}
              options={STATUS_OPTIONS}
            />
          </View>
        </Card>
      ))}
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

function Pill({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.6 }]}
      hitSlop={6}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  land: { color: colors.textMuted, fontSize: 13 },
  metaKey: { color: colors.textMuted, fontSize: 14 },
  metaVal: { color: colors.text, fontSize: 14, fontWeight: '600' },
  wait: { color: colors.accent, fontSize: 18, fontWeight: '800', minWidth: 46, textAlign: 'center' },
  pill: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
