import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { BrandFooter } from '@/components/BrandFooter';
import { BrandLogo } from '@/components/BrandLogo';
import { Card } from '@/components/Card';
import { LiveBadge } from '@/components/LiveBadge';
import { Screen } from '@/components/Screen';
import { EventStatePill } from '@/components/StatusPill';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Colors, Spacing } from '@/constants/theme';
import { getDashboardStats, type DashboardStats } from '@/db/dashboard';
import { listEventsFromDate } from '@/db/events';
import type { EventListItem } from '@/db/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNowTick } from '@/hooks/use-now-tick';
import { useTheme } from '@/hooks/use-theme';
import {
  currentPeriod,
  formatDate,
  formatEventDate,
  formatMonth,
  formatTime12,
  isOngoing,
  todayISO,
} from '@/utils/format';

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
  useNowTick(); // re-evaluate the ongoing/LIVE window over time
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [schedule, setSchedule] = useState<EventListItem[]>([]);
  const period = currentPeriod();
  const today = todayISO();

  const todayEvents = schedule.filter((e) => e.event_date === today);
  const upcoming = schedule.filter((e) => e.event_date > today);
  const nextEvent = upcoming[0] ?? null;
  const liveNow = todayEvents.some((e) => isOngoing(e.event_date, e.login_time, e.logout_time));

  function confirmLogout() {
    Alert.alert('Log out?', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getDashboardStats(todayISO(), period), listEventsFromDate(todayISO())]).then(
        ([s, ev]) => {
          if (!active) return;
          setStats(s);
          setSchedule(ev);
        }
      );
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

      <Card onPress={() => router.push('/schedule')}>
        <View style={styles.todayHead}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            TODAY · {formatDate(today)}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            View schedule ›
          </ThemedText>
        </View>

        {todayEvents.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.todayEmpty}>
            No events today
          </ThemedText>
        ) : (
          todayEvents.map((e) => {
            const ongoing = isOngoing(e.event_date, e.login_time, e.logout_time);
            return (
              <View key={e.id} style={styles.todayEventRow}>
                <View style={styles.todayEventText}>
                  <ThemedText style={styles.todayEventName}>{e.client_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {e.login_time ? `${formatTime12(e.login_time)} · ` : ''}
                    {e.proctor_count} proctor{e.proctor_count === 1 ? '' : 's'}
                  </ThemedText>
                </View>
                {ongoing ? <LiveBadge /> : <EventStatePill status={e.status} ongoing={false} />}
              </View>
            );
          })
        )}

        <View style={[styles.nextLine, { borderTopColor: theme.border }]}>
          {liveNow ? (
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              ● Live now
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {nextEvent
              ? `Next event: ${formatEventDate(nextEvent.event_date)} — ${nextEvent.client_name}`
              : 'No upcoming events scheduled'}
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
  todayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  todayEmpty: { marginTop: Spacing.two },
  todayEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  todayEventText: { flex: 1, gap: 2 },
  todayEventName: { fontSize: 16, fontWeight: '600' },
  nextLine: {
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
  },
  statGrid: { flexDirection: 'row', gap: Spacing.two },
  statCard: { flex: 1, alignItems: 'center', gap: Spacing.half },
  statValue: { fontSize: 30, fontWeight: '700' },
  modules: { gap: Spacing.two, marginTop: Spacing.one },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  moduleIcon: { width: 28, textAlign: 'center' },
  moduleText: { flex: 1, gap: 2 },
  moduleTitle: { fontSize: 20 },
});