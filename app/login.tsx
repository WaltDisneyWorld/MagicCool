import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, Screen, Subtitle, Title } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, radius, space } from '@/theme/colors';

export default function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function submit() {
    if (login(pin)) {
      setError('');
      router.replace('/admin');
    } else {
      setError('Incorrect PIN. Try the demo PIN 1955.');
    }
  }

  return (
    <Screen>
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
      </View>
      <Title>Admin Sign In</Title>
      <Subtitle>Enter your operator PIN to manage tickets, fast passes and attractions.</Subtitle>

      <Card style={{ marginTop: space.md }}>
        <Field
          label="Operator PIN"
          value={pin}
          onChangeText={setPin}
          placeholder="••••"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          onSubmitEditing={submit}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Sign In" onPress={submit} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  error: { color: colors.danger, fontSize: 14, marginBottom: space.sm },
});
