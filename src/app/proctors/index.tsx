import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { listActiveProctors } from '@/db/proctors';
import type { Proctor } from '@/db/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/theme';

export default function ProctorListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [proctors, setProctors] = useState<Proctor[] | null>(null);

  const reload = useCallback(() => {
    let active = true;
    listActiveProctors(search).then((rows) => active && setProctors(rows));
    return () => {
      active = false;
    };
  }, [search]);

  useFocusEffect(reload);

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerRight: () => <AddButton onPress={() => router.push('/proctors/form')} /> }} />
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or phone"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.search,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        />
      </View>

      <FlatList
        data={proctors ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/proctors/${item.id}`)}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText style={styles.name}>{item.full_name}</ThemedText>
                <ThemedText themeColor="textSecondary">{item.phone}</ThemedText>
              </View>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 24 }}>›</ThemedText>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          proctors === null ? null : (
            <EmptyState
              title="No proctors yet"
              hint={search ? 'No matches for your search.' : 'Tap + to add your first proctor.'}
            />
          )
        }
      />
    </View>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <ThemedText style={{ color: c.tint, fontSize: 17, fontWeight: '600' }}>+ Add</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: {
    padding: Spacing.three,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  search: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    minHeight: 48,
  },
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    padding: Spacing.three,
    paddingTop: 0,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { gap: 2, flex: 1 },
  name: { fontSize: 17, fontWeight: '600' },
});