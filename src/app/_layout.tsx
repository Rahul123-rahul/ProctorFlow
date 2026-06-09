import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { getDb } from '@/db/database';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

// Match the navigation chrome (header bar + scene) to our light-blue background.
const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    primary: Colors.light.tint,
    border: Colors.light.border,
    text: Colors.light.text,
  },
};
const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    primary: Colors.dark.tint,
    border: Colors.dark.border,
    text: Colors.dark.text,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navTheme = colorScheme === 'dark' ? DarkNavTheme : LightNavTheme;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <DatabaseGate>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </DatabaseGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Renders the navigator and keeps the user on /login until they sign in. */
function RootNavigator() {
  const { authed } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authed === null) return; // still loading the persisted session
    const inLogin = segments[0] === 'login';
    if (!authed && !inLogin) {
      router.replace('/login');
    } else if (authed && inLogin) {
      router.replace('/');
    }
  }, [authed, segments, router]);

  if (authed === null) return <Centered>{<Loading />}</Centered>;

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: 'ProConnectify' }} />
      <Stack.Screen name="schedule" options={{ title: 'Schedule' }} />
      <Stack.Screen name="proctors/index" options={{ title: 'Proctors' }} />
      <Stack.Screen name="proctors/form" options={{ title: 'Proctor' }} />
      <Stack.Screen name="proctors/[id]" options={{ title: 'Proctor' }} />
      <Stack.Screen name="clients/index" options={{ title: 'Clients' }} />
      <Stack.Screen name="clients/form" options={{ title: 'Client' }} />
      <Stack.Screen name="events/index" options={{ title: 'Events' }} />
      <Stack.Screen name="events/new" options={{ title: 'New Event' }} />
      <Stack.Screen name="events/[id]" options={{ title: 'Event' }} />
      <Stack.Screen name="events/form" options={{ title: 'Edit Event' }} />
      <Stack.Screen name="payments/index" options={{ title: 'Payments' }} />
      <Stack.Screen name="statement/index" options={{ title: 'Monthly Statement' }} />
    </Stack>
  );
}

/** Opens + migrates the SQLite database once before rendering any screen. */
function DatabaseGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getDb()
      .then(() => mounted && setReady(true))
      .catch((e) => mounted && setError(String(e?.message ?? e)));
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <Centered>
        <ThemedText type="subtitle">Database error</ThemedText>
        <ThemedText themeColor="danger">{error}</ThemedText>
      </Centered>
    );
  }

  if (!ready) {
    return (
      <Centered>
        <Loading />
      </Centered>
    );
  }

  return <>{children}</>;
}

function Loading() {
  const theme = useTheme();
  return (
    <>
      <ActivityIndicator size="large" color={theme.tint} />
      <ThemedText themeColor="textSecondary">Loading…</ThemedText>
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.center, { backgroundColor: theme.background }]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
});