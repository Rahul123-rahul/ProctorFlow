import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ClientLogo } from '@/components/ClientLogo';
import { DateField } from '@/components/DateField';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { MonthSelector } from '@/components/MonthSelector';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  addAdditionalPayment,
  deleteAdditionalPayment,
  getClientStatement,
  listAdditionalPayments,
} from '@/db/statement';
import type { AdditionalPayment, ClientStatementGroup } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { currentPeriod, formatDate, formatINR, formatMonth, todayISO } from '@/utils/format';

function buildStatementText(
  period: string,
  groups: ClientStatementGroup[],
  additional: AdditionalPayment[],
  grandTotal: number
): string {
  const out: string[] = [];
  out.push(`*ProctorFlow — Statement for ${formatMonth(period)}*`);
  out.push('='.repeat(40));
  out.push('');

  // Per client: just the dates + proctor counts (no per-client subtotal).
  for (const g of groups) {
    out.push(`*${g.client_name.toUpperCase()}*`);
    for (const ev of g.events) {
      out.push(`${formatDate(ev.event_date)} — ${ev.proctor_count} proctors`);
    }
    out.push('');
  }

  // Grand total: client = proctors × fee, then additional fees, then the total.
  out.push('='.repeat(40));
  out.push('*GRAND TOTAL*');
  for (const g of groups) {
    out.push(`${g.client_name}: ${g.total_proctors} × ${formatINR(g.rate)} = ${formatINR(g.subtotal)}`);
  }
  for (const a of additional) {
    const when = a.date ? ` (${formatDate(a.date)})` : '';
    out.push(`${a.reason || 'Additional'}${when}: ${formatINR(a.amount)}`);
  }
  out.push(`*TOTAL: ${formatINR(grandTotal)}*`);
  return out.join('\n');
}

export default function StatementScreen() {
  const theme = useTheme();
  const [period, setPeriod] = useState(currentPeriod());
  const [groups, setGroups] = useState<ClientStatementGroup[]>([]);
  const [additional, setAdditional] = useState<AdditionalPayment[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [apDate, setApDate] = useState(todayISO());
  const [apReason, setApReason] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apError, setApError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoaded(false);
      Promise.all([getClientStatement(period), listAdditionalPayments(period)]).then(([g, a]) => {
        if (!active) return;
        setGroups(g);
        setAdditional(a);
        setSelected(new Set(g.map((x) => x.client_id))); // all clients selected by default
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }, [period])
  );

  function reloadAdditional() {
    listAdditionalPayments(period).then(setAdditional);
  }

  function toggleClient(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedGroups = useMemo(
    () => groups.filter((g) => selected.has(g.client_id)),
    [groups, selected]
  );
  const clientsSubtotal = useMemo(
    () => selectedGroups.reduce((s, g) => s + g.subtotal, 0),
    [selectedGroups]
  );
  const additionalTotal = useMemo(
    () => additional.reduce((s, a) => s + a.amount, 0),
    [additional]
  );
  const grandTotal = clientsSubtotal + additionalTotal;
  const hasData = groups.length > 0 || additional.length > 0;

  async function saveAdditional() {
    const amount = Number(apAmount);
    if (apAmount.trim() === '' || Number.isNaN(amount) || amount <= 0) {
      setApError('Enter a valid amount');
      return;
    }
    await addAdditionalPayment(period, apDate, apReason, amount);
    setAddOpen(false);
    setApReason('');
    setApAmount('');
    setApDate(todayISO());
    setApError(null);
    reloadAdditional();
  }

  function confirmDeleteAdditional(a: AdditionalPayment) {
    Alert.alert('Remove additional payment?', `${a.reason || 'Additional'} — ${formatINR(a.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteAdditionalPayment(a.id);
          reloadAdditional();
        },
      },
    ]);
  }

  async function handleExport() {
    await Share.share({
      title: `ProctorFlow statement ${formatMonth(period)}`,
      message: buildStatementText(period, selectedGroups, additional, grandTotal),
    });
  }

  return (
    <Screen
      footer={
        hasData ? <Button title="Share for agent" onPress={handleExport} /> : undefined
      }>
      <MonthSelector period={period} onChange={setPeriod} />

      {!hasData ? (
        loaded ? (
          <EmptyState
            title="Nothing to report"
            hint="No completed events this month. Mark events completed, or add an additional payment below."
          />
        ) : null
      ) : (
        <>
          {groups.map((g) => {
            const isOn = selected.has(g.client_id);
            return (
              <Card key={g.client_id}>
                <Pressable onPress={() => toggleClient(g.client_id)} style={styles.clientHead}>
                  <Checkbox checked={isOn} />
                  <ClientLogo name={g.client_name} logoUrl={g.client_logo_url} size={32} />
                  <ThemedText style={styles.clientName}>{g.client_name}</ThemedText>
                </Pressable>

                <View style={[styles.body, !isOn && styles.dim]}>
                  {g.events.map((ev) => (
                    <View key={ev.event_id} style={styles.line}>
                      <ThemedText type="small" style={styles.lineLeft}>
                        {formatDate(ev.event_date)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {ev.proctor_count} proctors
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </Card>
            );
          })}

          {/* Additional payments */}
          <Card>
            <View style={styles.apHead}>
              <ThemedText style={styles.clientName}>Additional payments</ThemedText>
              <Pressable onPress={() => setAddOpen(true)} hitSlop={8}>
                <ThemedText style={{ color: theme.tint, fontWeight: '600' }}>+ Add</ThemedText>
              </Pressable>
            </View>
            {additional.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                None. Add travel, bonuses, or other costs to include in the total.
              </ThemedText>
            ) : (
              additional.map((a) => (
                <View key={a.id} style={styles.line}>
                  <View style={styles.lineLeft}>
                    <ThemedText type="small">{a.reason || 'Additional'}</ThemedText>
                    {a.date ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatDate(a.date)}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText type="small">{formatINR(a.amount)}</ThemedText>
                  <Pressable onPress={() => confirmDeleteAdditional(a)} hitSlop={8} style={styles.del}>
                    <ThemedText style={{ color: theme.danger, fontSize: 18 }}>×</ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </Card>

          {/* Grand total breakdown */}
          <Card style={{ backgroundColor: theme.tintMuted }}>
            <ThemedText style={[styles.grandLabel, { color: theme.tint }]}>Grand total</ThemedText>

            {selectedGroups.map((g) => (
              <View key={g.client_id} style={styles.gtLine}>
                <View style={styles.lineLeft}>
                  <ThemedText type="small">{g.client_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {g.total_proctors} × {formatINR(g.rate)}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">{formatINR(g.subtotal)}</ThemedText>
              </View>
            ))}

            {additional.map((a) => (
              <View key={a.id} style={styles.gtLine}>
                <View style={styles.lineLeft}>
                  <ThemedText type="small">{a.reason || 'Additional'}</ThemedText>
                  {a.date ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDate(a.date)}
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText type="smallBold">{formatINR(a.amount)}</ThemedText>
              </View>
            ))}

            <View style={[styles.grandRow, { borderTopColor: theme.tint }]}>
              <ThemedText style={[styles.grandLabel, { color: theme.tint }]}>Total</ThemedText>
              <ThemedText style={[styles.grandValue, { color: theme.tint }]}>
                {formatINR(grandTotal)}
              </ThemedText>
            </View>
          </Card>
        </>
      )}

      {/* Add additional payment */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              Additional payment
            </ThemedText>
            <DateField label="Date" value={apDate} onChange={setApDate} />
            <Field
              label="Reason"
              value={apReason}
              onChangeText={setApReason}
              placeholder="e.g. Travel reimbursement"
            />
            <Field
              label="Amount (₹)"
              required
              value={apAmount}
              onChangeText={setApAmount}
              placeholder="e.g. 2000"
              keyboardType="numeric"
              error={apError}
            />
            <Button title="Add payment" onPress={saveAdditional} />
            <Button title="Cancel" variant="secondary" onPress={() => setAddOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.checkbox,
        {
          borderColor: checked ? theme.tint : theme.border,
          backgroundColor: checked ? theme.tint : 'transparent',
        },
      ]}>
      {checked ? <ThemedText style={{ color: theme.onTint, fontSize: 14 }}>✓</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clientHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  clientName: { fontSize: 18, fontWeight: '700', flex: 1 },
  body: { marginTop: Spacing.two },
  dim: { opacity: 0.4 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 3,
  },
  lineLeft: { flex: 1, gap: 2 },
  gtLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 3,
  },
  apHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  del: { paddingLeft: Spacing.one },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
  },
  grandLabel: { fontSize: 18, fontWeight: '700' },
  grandValue: { fontSize: 22, fontWeight: '700' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Spacing.one,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sheetTitle: { fontSize: 22, marginBottom: Spacing.one },
});