import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { EventStatusPill, PaymentStatusPill } from '@/components/StatusPill';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import {
  deactivateProctor,
  getProctor,
  getProctorEvents,
  getProctorPayments,
} from '@/db/proctors';
import type { Proctor, ProctorEventView, ProctorPaymentView } from '@/db/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { eventDisplayName, formatDate, formatINR, formatTime12 } from '@/utils/format';

export default function ProctorDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);

  const [proctor, setProctor] = useState<Proctor | null>(null);
  const [events, setEvents] = useState<ProctorEventView[]>([]);
  const [payments, setPayments] = useState<ProctorPaymentView[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getProctor(id), getProctorEvents(id), getProctorPayments(id)]).then(
        ([p, d, pay]) => {
          if (!active) return;
          setProctor(p);
          setEvents(d);
          setPayments(pay);
        }
      );
      return () => {
        active = false;
      };
    }, [id])
  );

  function confirmDeactivate() {
    Alert.alert(
      'Deactivate proctor?',
      `${proctor?.full_name} will be hidden from new deployments but their history is kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            await deactivateProctor(id);
            router.back();
          },
        },
      ]
    );
  }

  if (!proctor) {
    return <Screen scroll={false}><View /></Screen>;
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: proctor.full_name,
          headerRight: () => (
            <EditButton onPress={() => router.push(`/proctors/form?id=${id}`)} />
          ),
        }}
      />

      <Card>
        <ThemedText type="subtitle" style={styles.name}>
          {proctor.full_name}
        </ThemedText>
        {proctor.is_active === 0 ? (
          <ThemedText type="smallBold" themeColor="danger">
            Inactive
          </ThemedText>
        ) : null}
        <InfoRow label="Phone" value={proctor.phone} />
        <InfoRow label="Government ID" value={proctor.govt_id} />
        <InfoRow label="Email" value={proctor.email} />
      </Card>

      <SectionTitle text={`Event history (${events.length})`} />
      {events.length === 0 ? (
        <ThemedText themeColor="textSecondary">No events yet.</ThemedText>
      ) : (
        events.map((d) => (
          <Card key={d.id}>
            <View style={styles.histRow}>
              <View style={styles.histText}>
                <ThemedText style={styles.histTitle}>{d.client_name}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {formatDate(d.event_date)}
                  {d.login_time ? ` · ${formatTime12(d.login_time)}` : ''}
                </ThemedText>
                {d.replaced_proctor_name ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Replaced {d.replaced_proctor_name}
                  </ThemedText>
                ) : null}
              </View>
              <EventStatusPill status={d.status} />
            </View>
          </Card>
        ))
      )}

      <SectionTitle text={`Payment history (${payments.length})`} />
      {payments.length === 0 ? (
        <ThemedText themeColor="textSecondary">No payments yet.</ThemedText>
      ) : (
        payments.map((p) => (
          <Card key={p.id}>
            <View style={styles.histRow}>
              <View style={styles.histText}>
                <ThemedText style={styles.histTitle}>
                  {eventDisplayName(p.event_name, p.event_date, p.client_name)}
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {formatDate(p.event_date)} · {formatINR(p.amount)}
                  {p.paid_date ? ` · paid ${formatDate(p.paid_date)}` : ''}
                </ThemedText>
              </View>
              <PaymentStatusPill status={p.status} />
            </View>
          </Card>
        ))
      )}

      {proctor.is_active === 1 ? (
        <View style={styles.deactivate}>
          <Button title="Deactivate proctor" variant="danger" onPress={confirmDeactivate} />
        </View>
      ) : null}
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.infoValue}>{value || '—'}</ThemedText>
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
      {text.toUpperCase()}
    </ThemedText>
  );
}

function EditButton({ onPress }: { onPress: () => void }) {
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <ThemedText style={{ color: c.tint, fontSize: 17, fontWeight: '600' }}>Edit</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 24 },
  infoRow: { flexDirection: 'row', marginTop: Spacing.two, gap: Spacing.two },
  infoLabel: { width: 120 },
  infoValue: { flex: 1 },
  section: { marginTop: Spacing.two },
  histRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  histText: { flex: 1, gap: 2 },
  histTitle: { fontSize: 16, fontWeight: '600' },
  deactivate: { marginTop: Spacing.three },
});