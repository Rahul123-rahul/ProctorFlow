import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ClientLogo } from '@/components/ClientLogo';
import { EmptyState } from '@/components/EmptyState';
import { LiveBadge } from '@/components/LiveBadge';
import { EventStatePill } from '@/components/StatusPill';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { listEventsFromDate } from '@/db/events';
import type { EventListItem } from '@/db/types';
import { useNowTick } from '@/hooks/use-now-tick';
import { useTheme } from '@/hooks/use-theme';
import {
  eventDisplayName,
  formatEventDate,
  formatTime12,
  isOngoing,
  isToday,
  todayISO,
} from '@/utils/format';

export default function ScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  useNowTick();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listEventsFromDate(todayISO()).then((rows) => {
        if (!active) return;
        setEvents(rows);
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const sections = useMemo(() => {
    const today = events.filter((e) => isToday(e.event_date));
    const upcoming = events.filter((e) => !isToday(e.event_date));
    const out: { title: string; data: EventListItem[] }[] = [];
    if (today.length) out.push({ title: 'Today', data: today });
    if (upcoming.length) out.push({ title: 'Upcoming', data: upcoming });
    return out;
  }, [events]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            {section.title.toUpperCase()} · {section.data.length}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <Card onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })}>
            <View style={styles.row}>
              <ClientLogo name={item.client_name} logoUrl={item.client_logo_url} size={40} />
              <View style={styles.rowText}>
                <ThemedText style={styles.title}>{formatEventDate(item.event_date)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.client_name} · {item.proctor_count}
                  {item.headcount != null ? `/${item.headcount}` : ''} proctor
                  {item.proctor_count === 1 && item.headcount == null ? '' : 's'}
                  {item.login_time ? ` · ${formatTime12(item.login_time)}` : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {eventDisplayName(item.event_name, item.event_date, item.client_name)}
                </ThemedText>
              </View>
              <View style={styles.rowRight}>
                {isOngoing(item.event_date, item.login_time, item.logout_time) ? <LiveBadge /> : null}
                <EventStatePill
                  status={item.status}
                  ongoing={isOngoing(item.event_date, item.login_time, item.logout_time)}
                />
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !loaded ? null : (
            <EmptyState
              title="Nothing scheduled"
              hint="No events today or upcoming. Create one from the Events tab."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    gap: Spacing.two,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  sectionHeader: { marginTop: Spacing.two, marginBottom: Spacing.half },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  rowText: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: Spacing.one },
  title: { fontSize: 17, fontWeight: '600' },
});