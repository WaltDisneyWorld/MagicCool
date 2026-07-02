import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  Field,
  KeyValue,
  Row,
  Screen,
  SectionLabel,
  Segmented,
} from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import {
  eraseTag,
  isNfcSupported,
  lockTag,
  readTagDetails,
  writeTag,
  TagDetails,
  TagPayload,
} from '@/services/nfc';
import { verifyTagPayload } from '@/services/signing';
import { colors, space } from '@/theme/colors';

type Mode = 'inspect' | 'write' | 'erase' | 'lock';

/**
 * Unlike ScanPad (which reads the tag itself), each tool here owns its own
 * NFC session — so this pad only triggers the operation, keeping real
 * hardware to a single tap.
 */
function ActionPad({ label, onRun }: { label: string; onRun: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const [hasNfc, setHasNfc] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isNfcSupported().then((s) => active && setHasNfc(s));
    return () => {
      active = false;
    };
  }, []);

  async function press() {
    if (busy) return;
    setBusy(true);
    try {
      await onRun();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        onPress={press}
        disabled={busy}
        style={({ pressed }) => [styles.pad, pressed && styles.padPressed]}
      >
        {busy ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Ionicons name="wifi" size={52} color={colors.primary} style={{ transform: [{ rotate: '90deg' }] }} />
        )}
        <Text style={styles.padLabel}>{busy ? 'Hold tag near device…' : label}</Text>
      </Pressable>
      {hasNfc === false && (
        <Text style={styles.simHint}>Simulation mode — no NFC hardware detected.</Text>
      )}
    </View>
  );
}

interface InspectResult extends TagDetails {
  linkedGuest: string | null;
  linkedTicketId: string | null;
  payloadTicketId: string | null;
}

export default function NfcToolsScreen() {
  const router = useRouter();
  const ticketByNfc = useAppStore((s) => s.ticketByNfc);
  const ticketById = useAppStore((s) => s.ticketById);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [mode, setMode] = useState<Mode>('inspect');
  const [writeText, setWriteText] = useState('');
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [lastAction, setLastAction] = useState<{ title: string; detail: string; simulated: boolean } | null>(null);
  const [passbackInput, setPassbackInput] = useState(String(settings.antiPassbackMinutes));

  function clearResults() {
    setInspect(null);
    setLastAction(null);
  }

  async function runInspect() {
    const details = await readTagDetails();
    const byUid = ticketByNfc(details.uid);
    const payloadTicketId = details.text ? await verifyTagPayload(details.text) : null;
    // Fall back to the signed payload when the UID isn't in the database
    // (e.g. tag provisioned on another device).
    const linked = byUid ?? (payloadTicketId ? ticketById(payloadTicketId) : undefined);
    setInspect({
      ...details,
      linkedGuest: linked?.guestName ?? null,
      linkedTicketId: linked?.id ?? null,
      payloadTicketId,
    });
    setLastAction(null);
  }

  async function runWrite() {
    if (!writeText.trim()) {
      Alert.alert('Nothing to write', 'Enter the text to write to the tag.');
      return;
    }
    const res = await writeTag(writeText.trim());
    setLastAction({
      title: 'Tag written',
      detail: `Wrote ${writeText.trim().length} chars to ${res.uid}`,
      simulated: res.simulated,
    });
    setInspect(null);
  }

  async function runErase() {
    const res = await eraseTag();
    setLastAction({ title: 'Tag erased', detail: `NDEF cleared on ${res.uid}`, simulated: res.simulated });
    setInspect(null);
  }

  function runLock() {
    Alert.alert(
      'Permanently lock tag?',
      'This makes the tag read-only forever. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock forever',
          style: 'destructive',
          onPress: async () => {
            const res: TagPayload = await lockTag();
            setLastAction({
              title: 'Tag locked',
              detail: `${res.uid} is now read-only`,
              simulated: res.simulated,
            });
            setInspect(null);
          },
        },
      ],
    );
  }

  const scanHandlers: Record<Mode, { label: string; run: () => void | Promise<void> }> = {
    inspect: { label: 'Tap tag to inspect', run: runInspect },
    write: { label: 'Tap tag to write', run: runWrite },
    erase: { label: 'Tap tag to erase', run: runErase },
    lock: { label: 'Tap tag to lock (read-only)', run: runLock },
  };

  return (
    <Screen>
      <SectionLabel>Tag tools</SectionLabel>
      <Segmented<Mode>
        value={mode}
        onChange={(m) => {
          setMode(m);
          clearResults();
        }}
        options={[
          { label: 'Inspect', value: 'inspect' },
          { label: 'Write', value: 'write' },
          { label: 'Erase', value: 'erase' },
          { label: 'Lock', value: 'lock' },
        ]}
      />

      {mode === 'write' && (
        <Field
          label="Text to write (NDEF text record)"
          value={writeText}
          onChangeText={setWriteText}
          placeholder="e.g. https://park.example/map or any text"
          autoCapitalize="none"
        />
      )}
      {mode === 'lock' && (
        <Card style={{ borderColor: `${colors.danger}55` }}>
          <Row>
            <Ionicons name="warning" size={18} color={colors.danger} />
            <Text style={styles.warnText}>
              Locking is permanent. Use for tags leaving the park (souvenirs, printed links).
            </Text>
          </Row>
        </Card>
      )}

      <ActionPad label={scanHandlers[mode].label} onRun={() => scanHandlers[mode].run()} />

      {lastAction && (
        <Card style={{ borderColor: `${colors.success}55` }}>
          <Row>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>{lastAction.title}</Text>
              <Text style={styles.actionDetail}>{lastAction.detail}</Text>
            </View>
          </Row>
          {lastAction.simulated && <Badge label="Simulated" tone="warning" />}
        </Card>
      )}

      {inspect && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.actionTitle}>Tag report</Text>
            {inspect.simulated && <Badge label="Simulated" tone="warning" />}
          </Row>
          <KeyValue k="UID" v={inspect.uid} />
          <KeyValue k="Tech" v={inspect.techTypes.length ? inspect.techTypes.join(', ') : 'Unknown'} />
          <KeyValue k="Capacity" v={inspect.maxSize != null ? `${inspect.maxSize} bytes` : 'Unknown'} />
          <KeyValue
            k="Writable"
            v={inspect.isWritable == null ? 'Unknown' : inspect.isWritable ? 'Yes' : 'No (locked)'}
            tone={inspect.isWritable === false ? 'warning' : undefined}
          />
          <KeyValue k="NDEF records" v={String(inspect.recordCount)} />
          <KeyValue k="Payload" v={inspect.text ?? '(empty)'} />
          <KeyValue
            k="Signature"
            v={
              inspect.text
                ? inspect.payloadTicketId
                  ? `Valid → ${inspect.payloadTicketId}`
                  : 'Not a valid MagicCool payload'
                : 'No payload'
            }
            tone={inspect.text ? (inspect.payloadTicketId ? 'success' : 'danger') : 'muted'}
          />
          <KeyValue
            k="Linked guest"
            v={inspect.linkedGuest ?? 'None'}
            tone={inspect.linkedGuest ? 'success' : 'muted'}
          />
          {inspect.linkedTicketId && (
            <Button
              title="Open ticket"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/ticket/[id]', params: { id: inspect.linkedTicketId! } })
              }
            />
          )}
        </Card>
      )}

      <SectionLabel>Gate security settings</SectionLabel>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Require signed tags</Text>
            <Text style={styles.settingDesc}>
              Deny gate entry unless the tag carries a valid MC1 signed payload. Catches blank and
              cloned tags.
            </Text>
          </View>
          <Switch
            value={settings.requireSignedTags}
            onValueChange={(v) => updateSettings({ requireSignedTags: v })}
            trackColor={{ true: colors.primary, false: colors.cardBorder }}
            thumbColor={colors.text}
          />
        </Row>
      </Card>
      <Card>
        <Text style={styles.settingTitle}>Anti-passback cooldown</Text>
        <Text style={styles.settingDesc}>
          Minutes before the same ticket can re-enter the gate. 0 disables the check.
        </Text>
        <Row>
          <View style={{ flex: 1 }}>
            <Field
              label="Minutes"
              value={passbackInput}
              onChangeText={setPassbackInput}
              keyboardType="number-pad"
            />
          </View>
          <Button
            title="Save"
            variant="secondary"
            onPress={() => {
              const n = Math.max(0, parseInt(passbackInput, 10) || 0);
              updateSettings({ antiPassbackMinutes: n });
              setPassbackInput(String(n));
            }}
          />
        </Row>
        <Badge
          label={
            settings.antiPassbackMinutes > 0
              ? `Active: ${settings.antiPassbackMinutes} min`
              : 'Disabled'
          }
          tone={settings.antiPassbackMinutes > 0 ? 'primary' : 'muted'}
        />
      </Card>
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    paddingVertical: space.xxl,
    alignItems: 'center',
    gap: space.md,
  },
  padPressed: { borderColor: colors.primary, backgroundColor: colors.bgElevated },
  padLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  simHint: { color: colors.warning, fontSize: 12, textAlign: 'center' },
  actionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  actionDetail: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  warnText: { color: colors.danger, fontSize: 13, flex: 1 },
  settingTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  settingDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: space.sm },
});
