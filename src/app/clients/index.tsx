import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ClientLogo } from '@/components/ClientLogo';
import { EmptyState } from '@/components/EmptyState';
import { ThemedText } from '@/components/themed-text';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { listClients } from '@/db/clients';
import type { Client } from '@/db/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatINR } from '@/utils/format';

export default function ClientListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [clients, setClients] = useState<Client[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listClients().then((rows) => active && setClients(rows));
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{ headerRight: () => <AddButton onPress={() => router.push('/clients/form')} /> }}
      />
      <FlatList
        data={clients ?? []}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/clients/form?id=${item.id}`)}>
            <View style={styles.row}>
              <ClientLogo name={item.name} logoUrl={item.logo_url} size={40} />
              <View style={styles.rowText}>
                <ThemedText style={styles.name}>{item.name}</ThemedText>
                {item.notes ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.notes}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.rateBox}>
                <ThemedText style={[styles.rate, { color: theme.tint }]}>
                  {formatINR(item.rate_per_proctor)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  per proctor
                </ThemedText>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          clients === null ? null : (
            <EmptyState title="No clients yet" hint="Tap + to add your first client." />
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
  list: {
    gap: Spacing.two,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600' },
  rateBox: { alignItems: 'flex-end' },
  rate: { fontSize: 17, fontWeight: '700' },
});