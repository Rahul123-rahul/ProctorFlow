import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { BrandFooter } from '@/components/BrandFooter';
import { BrandLogo } from '@/components/BrandLogo';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Colors, Spacing } from '@/constants/theme';
import { getDashboardStats, type DashboardStats } from '@/db/dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { currentPeriod, formatDate, formatMonth, todayISO } from '@/utils/format';

const MODULES = [
  { href: '/proctors', title: 'Proctors', subtitle: 'Directory & history', icon: 'people' },
  { href: '/clients', title: 'Clients', subtitle: 'Companies & rates', icon: 'business' },
  { href: '/events', title: 'Events', subtitle: 'Schedule & proctors', icon: 'calendar' },
  { href: '/payments', title: 'Payments', subtitle: 'Monthly payouts', icon: 'card' },
  { href: '/statement', title: 'Statement', subtitle: 'Export for agent', icon: 'document-text' },
] as const;

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const period = currentPeriod();

  function confirmLogout() {
    Alert.alert('Log out?', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDashboardStats(todayISO(), period).then((s) => active && setStats(s));
      return () => {
        active = false;
      };
    }, [period])
  );

  return (
    <Screen>
      <Stack.Screen options={{ headerRight: () => <LogoutButton onPress={confirmLogout} /> }} />

      <Card style={{ backgroundColor: theme.tintMuted }}>
        <View style={styles.brandRow}>
          <BrandLogo size={48} />
          <View style={styles.brandText}>
            <ThemedText style={[styles.brandName, { color: theme.tint }]}>{Brand.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {Brand.tagline}
            </ThemedText>
          </View>
        </View>
      </Card>

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          TODAY · {formatDate(todayISO())}
        </ThemedText>
        <View style={styles.todayRow}>
          <ThemedText style={styles.bigNumber}>{stats?.todayCount ?? '—'}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.todayLabel}>
            {stats?.todayCount === 1 ? 'event' : 'events'} today
          </ThemedText>
        </View>
      </Card>

      <ThemedText type="smallBold" themeColor="textSecondary">
        {formatMonth(period).toUpperCase()}
      </ThemedText>
      <View style={styles.statGrid}>
        <Stat value={stats?.monthEvents} label="Events" />
        <Stat value={stats?.paymentsPending} label="Pending" tone="warning" />
        <Stat value={stats?.paymentsCleared} label="Cleared" tone="success" />
      </View>

      <View style={styles.modules}>
        {MODULES.map((m) => (
          <Card key={m.href} onPress={() => router.push(m.href)}>
            <View style={styles.moduleRow}>
              <Ionicons name={m.icon} size={26} color={theme.tint} style={styles.moduleIcon} />
              <View style={styles.moduleText}>
                <ThemedText type="subtitle" style={styles.moduleTitle}>
                  {m.title}
                </ThemedText>
                <ThemedText themeColor="textSecondary">{m.subtitle}</ThemedText>
              </View>
              <ChevronRight />
            </View>
          </Card>
        ))}
      </View>

      <BrandFooter />
    </Screen>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number | undefined;
  label: string;
  tone?: 'warning' | 'success';
}) {
  const theme = useTheme();
  const color = tone === 'warning' ? theme.warning : tone === 'success' ? theme.success : theme.text;
  return (
    <Card style={styles.statCard}>
      <ThemedText style={[styles.statValue, { color }]}>{value ?? '—'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

function ChevronRight() {
  const theme = useTheme();
  return <ThemedText style={{ color: theme.textSecondary, fontSize: 24 }}>›</ThemedText>;
}

function LogoutButton({ onPress }: { onPress: () => void }) {
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <ThemedText style={{ color: c.tint, fontSize: 17, fontWeight: '600' }}>Log out</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  brandText: { flex: 1, gap: 2 },
  brandName: { fontSize: 22, fontWeight: '800' },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, marginTop: Spacing.one },
  bigNumber: { fontSize: 44, fontWeight: '700', lineHeight: 48 },
  todayLabel: { flex: 1 },
  statGrid: { flexDirection: 'row', gap: Spacing.two },
  statCard: { flex: 1, alignItems: 'center', gap: Spacing.half },
  statValue: { fontSize: 30, fontWeight: '700' },
  modules: { gap: Spacing.two, marginTop: Spacing.one },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  moduleIcon: { width: 28, textAlign: 'center' },
  moduleText: { flex: 1, gap: 2 },
  moduleTitle: { fontSize: 20 },
});