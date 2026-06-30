import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Row, Screen, Subtitle } from '@/components/ui';
import { colors, radius, space } from '@/theme/colors';

interface Mode {
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: '/scan' | '/redeem' | '/login';
  tint: string;
}

const MODES: Mode[] = [
  {
    title: 'Gate Entry',
    desc: 'Tap a guest ticket to validate park admission',
    icon: 'enter-outline',
    href: '/scan',
    tint: colors.success,
  },
  {
    title: 'Fast Pass Redeem',
    desc: 'Scan at an attraction to skip the standby line',
    icon: 'flash-outline',
    href: '/redeem',
    tint: colors.accent,
  },
  {
    title: 'Admin Panel',
    desc: 'Manage tickets, fast passes, attractions & reports',
    icon: 'settings-outline',
    href: '/login',
    tint: colors.primary,
  },
];

export default function Landing() {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.hero}>
        <Row>
          <View style={styles.logo}>
            <Ionicons name="sparkles" size={26} color={colors.bg} />
          </View>
          <View>
            <Text style={styles.brand}>MagicCool</Text>
            <Text style={styles.tag}>NFC Theme Park Platform</Text>
          </View>
        </Row>
        <Subtitle>Choose a station to get started. Every flow is driven by tapping an NFC ticket.</Subtitle>
      </View>

      {MODES.map((m) => (
        <Card key={m.href} onPress={() => router.push(m.href)}>
          <Row>
            <View style={[styles.iconWrap, { backgroundColor: `${m.tint}22`, borderColor: `${m.tint}55` }]}>
              <Ionicons name={m.icon} size={24} color={m.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{m.title}</Text>
              <Text style={styles.cardDesc}>{m.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
          </Row>
        </Card>
      ))}

      <Text style={styles.footer}>Admin demo PIN: 1955</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, marginBottom: space.sm, marginTop: space.lg },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  tag: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  cardDesc: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  footer: { color: colors.textFaint, fontSize: 13, textAlign: 'center', marginTop: space.lg },
});
