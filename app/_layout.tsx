import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ title: 'Gate Entry' }} />
        <Stack.Screen name="redeem" options={{ title: 'Fast Pass Redeem' }} />
        <Stack.Screen name="login" options={{ title: 'Admin Sign In', presentation: 'modal' }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="ticket/new" options={{ title: 'Issue Ticket', presentation: 'modal' }} />
        <Stack.Screen name="ticket/[id]" options={{ title: 'Ticket' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
