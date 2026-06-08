import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ClientLogo } from '@/components/ClientLogo';
import { EmptyState } from '@/components/EmptyState';
import { Select, type SelectOption } from '@/components/Select';
import { EventStatusPill } from '@/components/StatusPill';
import { ThemedText } from '@/components/themed-text';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { listClients } from '@/db/clients';
import { listEvents, type EventFilter } from '@/db/events';
import type { EventListItem } from '@/db/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { eventDisplayName, formatDate, formatTime12 } from '@/utils/format';

export default function EventLogScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [clientOptions, setClientOptions] = useState<SelectOption[]>([]);
  const [filterClient, setFilterClient] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const filter: EventFilter = useMemo(() => ({ clientId: filterClient }), [filterClient]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listEvents(filter).then((rows) => {
        if (!active) return;
        setEvents(rows);
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }, [filter])
  );

  useFocusEffect(
    useCallback(() => {
      listClients().then((rows) => setClientOptions(rows.map((c) => ({ id: c.id, label: c.name }))));
    }, [])
  );

  const sections = useMemo(() => {
    const map = new Map<string, EventListItem[]>();
    for (const e of events) {
      const arr = map.get(e.event_date) ?? [];
      arr.push(e);
      map.set(e.event_date, arr);
    }
    return Array.from(map, ([date, data]) => ({ title: date, data }));
  }, [events]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerBtns}>
              <HeaderText label={showFilter ? 'Done' : 'Filter'} onPress={() => setShowFilter((s) => !s)} />
              <HeaderText label="+ Add" onPress={() => router.push('/events/new')} />
            </View>
          ),
        }}
      />

      {showFilter ? (
        <View style={styles.filterBar}>
          <Select
            label="Filter by client"
            options={[{ id: -1, label: 'All clients' }, ...clientOptions]}
            value={filterClient ?? -1}
            onChange={(id) => setFilterClient(id === -1 ? null : id)}
            placeholder="All clients"
          />
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            {formatDate(section.title).toUpperCase()} · {section.data.length}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <Card onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })}>
            <View style={styles.row}>
              <ClientLogo name={item.client_name} logoUrl={item.client_logo_url} size={40} />
              <View style={styles.rowText}>
                <ThemedText style={styles.clientName}>
                  {eventDisplayName(item.event_name, item.event_date, item.client_name)}
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {item.client_name} · {item.proctor_count}
                  {item.headcount != null ? `/${item.headcount}` : ''} proctor
                  {item.proctor_count === 1 && item.headcount == null ? '' : 's'}
                  {item.login_time ? ` · ${formatTime12(item.login_time)}` : ''}
                </ThemedText>
                {item.notes ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.notes}
                  </ThemedText>
                ) : null}
              </View>
              <EventStatusPill status={item.status} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !loaded ? null : (
            <EmptyState
              title="No events"
              hint={
                filterClient !== null
                  ? 'No events for this client.'
                  : 'Tap + Add to create your first event.'
              }
            />
          )
        }
      />
    </View>
  );
}

function HeaderText({ label, onPress }: { label: string; onPress: () => void }) {
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <ThemedText style={{ color: c.tint, fontSize: 17, fontWeight: '600' }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBtns: { flexDirection: 'row', gap: Spacing.three },
  filterBar: {
    padding: Spacing.three,
    paddingBottom: 0,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  list: {
    gap: Spacing.two,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  sectionHeader: { marginTop: Spacing.two, marginBottom: Spacing.half },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  rowText: { flex: 1, gap: 2 },
  clientName: { fontSize: 17, fontWeight: '600' },
});