import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ClientLogo } from '@/components/ClientLogo';
import { EmptyState } from '@/components/EmptyState';
import { MonthSelector } from '@/components/MonthSelector';
import { Screen } from '@/components/Screen';
import {
  EventPaymentStatusPill,
  PAYMENT_STATUS_LABEL,
  PaymentStatusPill,
} from '@/components/StatusPill';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  generateEventPayments,
  getEventPaymentGroups,
  getPeriodPaymentSummary,
  setPaymentStatus,
  type PeriodPaymentSummary,
} from '@/db/payments';
import type { EventPaymentGroup, EventPaymentProctor, PaymentStatus } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import {
  currentPeriod,
  eventDisplayName,
  formatDate,
  formatINR,
  formatMonth,
  todayISO,
} from '@/utils/format';

const STATUSES: PaymentStatus[] = ['pending', 'cleared', 'settled', 'on_hold'];

const STATUS_DESC: Record<PaymentStatus, string> = {
  pending: 'Not paid yet',
  cleared: 'Paid directly to this proctor',
  settled: 'Paid indirectly — via someone else (counts as paid)',
  on_hold: 'Payment paused for now',
};

export default function PaymentsScreen() {
  const theme = useTheme();
  const [period, setPeriod] = useState(currentPeriod());
  const [groups, setGroups] = useState<EventPaymentGroup[]>([]);
  const [summary, setSummary] = useState<PeriodPaymentSummary>({ total: 0, paid: 0, unpaid: 0 });
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sheetFor, setSheetFor] = useState<EventPaymentProctor | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const reload = useCallback(() => {
    let active = true;
    Promise.all([getEventPaymentGroups(period), getPeriodPaymentSummary(period)]).then(([g, s]) => {
      if (!active) return;
      setGroups(g);
      setSummary(s);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [period]);

  useFocusEffect(reload);

  function toggle(eventId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateEventPayments(period);
      reload();
      const parts = [`${result.generated} new payment row(s) created.`];
      if (result.skipped > 0) parts.push(`${result.skipped} already existed and were left unchanged.`);
      Alert.alert(`Generate Payments — ${formatMonth(period)}`, parts.join('\n'));
    } finally {
      setGenerating(false);
    }
  }

  async function applyStatus(status: PaymentStatus) {
    if (!sheetFor) return;
    await setPaymentStatus(sheetFor.payment_id, status, todayISO());
    setSheetFor(null);
    reload();
  }

  function payViaUpi(p: EventPaymentProctor, label: string) {
    // Fire the standard UPI intent — this opens the UPI app chooser (PhonePe, GPay…).
    // A saved UPI ID is added as the payee so the app can prefill; without it, the
    // app still opens and you complete the details there.
    const params = [
      `pn=${encodeURIComponent(p.proctor_name)}`,
      `am=${p.amount}`,
      'cu=INR',
      `tn=${encodeURIComponent(label)}`,
    ];
    const vpa = p.upi_id?.trim();
    if (vpa) params.unshift(`pa=${encodeURIComponent(vpa)}`);

    Linking.openURL(`upi://pay?${params.join('&')}`).catch(() => {
      Alert.alert('No UPI app found', 'Install a UPI app like PhonePe or Google Pay to pay here.');
    });
    // No auto status change — pay in your UPI app, then set the status manually here.
  }

  const openGroups = groups.filter((g) => g.payment_status === 'open');
  const completedGroups = groups.filter((g) => g.payment_status === 'completed');

  return (
    <Screen>
      <MonthSelector period={period} onChange={setPeriod} />

      <Card>
        <View style={styles.totalsRow}>
          <Total label="To pay out" value={summary.total} />
          <Total label="Paid" value={summary.paid} color={theme.success} />
          <Total label="Unpaid" value={summary.unpaid} color={theme.warning} />
        </View>
      </Card>

      <Button title="Generate Payments" onPress={handleGenerate} loading={generating} />

      {groups.length === 0 ? (
        loaded ? (
          <EmptyState
            title="No payments for this month"
            hint="Tap Generate Payments to create payouts for completed events."
          />
        ) : null
      ) : (
        <View style={styles.list}>
          {openGroups.map((g) => (
            <EventPaymentCard
              key={g.event_id}
              group={g}
              expanded={expanded.has(g.event_id)}
              onToggle={() => toggle(g.event_id)}
              onChangeStatus={setSheetFor}
              onPayUpi={payViaUpi}
            />
          ))}

          {openGroups.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.allDone}>
              All caught up — every payment this month is cleared or settled. 🎉
            </ThemedText>
          ) : null}

          {completedGroups.length > 0 ? (
            <Pressable
              onPress={() => setShowCompleted((s) => !s)}
              style={[styles.completedToggle, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {showCompleted ? 'Hide' : 'Show'} {completedGroups.length} completed event
                {completedGroups.length === 1 ? '' : 's'}
              </ThemedText>
            </Pressable>
          ) : null}

          {showCompleted
            ? completedGroups.map((g) => (
                <EventPaymentCard
                  key={g.event_id}
                  group={g}
                  expanded={expanded.has(g.event_id)}
                  onToggle={() => toggle(g.event_id)}
                  onChangeStatus={setSheetFor}
                  onPayUpi={payViaUpi}
                />
              ))
            : null}
        </View>
      )}

      {/* Per-proctor status picker */}
      <Modal
        visible={sheetFor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetFor(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              {sheetFor?.proctor_name}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sheetSub}>
              Set payment status
            </ThemedText>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                onPress={() => applyStatus(s)}
                style={({ pressed }) => [
                  styles.sheetAction,
                  { borderTopColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundElement },
                ]}>
                <View style={styles.sheetActionText}>
                  <PaymentStatusPill status={s} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.statusDesc}>
                    {STATUS_DESC[s]}
                  </ThemedText>
                </View>
                {sheetFor?.status === s ? (
                  <ThemedText style={{ color: theme.tint }}>✓</ThemedText>
                ) : null}
              </Pressable>
            ))}
            <View style={styles.cancelWrap}>
              <Button title="Cancel" variant="secondary" onPress={() => setSheetFor(null)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function EventPaymentCard({
  group: g,
  expanded,
  onToggle,
  onChangeStatus,
  onPayUpi,
}: {
  group: EventPaymentGroup;
  expanded: boolean;
  onToggle: () => void;
  onChangeStatus: (p: EventPaymentProctor) => void;
  onPayUpi: (p: EventPaymentProctor, label: string) => void;
}) {
  const theme = useTheme();
  const title = eventDisplayName(g.event_name, g.event_date, g.client_name);
  const label = title;

  return (
    <Card>
      <Pressable onPress={onToggle} style={styles.eventHead}>
        <ClientLogo name={g.client_name} logoUrl={g.client_logo_url} size={40} />
        <View style={styles.eventText}>
          <ThemedText style={styles.eventName}>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {g.client_name} · {formatDate(g.event_date)}
          </ThemedText>
        </View>
        <EventPaymentStatusPill status={g.payment_status} />
      </Pressable>

      <View style={[styles.eventTotals, { borderTopColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatINR(g.total)} · {g.paidCount} paid · {g.unpaidCount} unpaid
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.tint }}>
          {expanded ? '▾' : '▸'} {g.proctors.length}
        </ThemedText>
      </View>

      {expanded
        ? g.proctors.map((p) => (
            <View key={p.payment_id} style={[styles.proctorRow, { borderTopColor: theme.border }]}>
              <View style={styles.proctorText}>
                <ThemedText style={styles.proctorName}>{p.proctor_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatINR(p.amount)}
                  {p.paid_date ? ` · paid ${formatDate(p.paid_date)}` : ''}
                </ThemedText>
              </View>
              <View style={styles.proctorActions}>
                <Pressable onPress={() => onChangeStatus(p)}>
                  <PaymentStatusPill status={p.status} />
                </Pressable>
                {p.status === 'pending' ? (
                  <Pressable
                    onPress={() => onPayUpi(p, label)}
                    style={({ pressed }) => [
                      styles.upiBtn,
                      { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
                    ]}>
                    <ThemedText type="small" style={{ color: theme.onTint, fontWeight: '700' }}>
                      Pay via UPI
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        : null}
    </Card>
  );
}

function Total({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.total}>
      <ThemedText style={[styles.totalValue, color ? { color } : null]}>{formatINR(value)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  total: { flex: 1, alignItems: 'center', gap: 2 },
  totalValue: { fontSize: 18, fontWeight: '700' },
  list: { gap: Spacing.two },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  eventText: { flex: 1, gap: 2 },
  eventName: { fontSize: 17, fontWeight: '600' },
  eventTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  proctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  proctorText: { flex: 1, gap: 2 },
  proctorName: { fontSize: 16, fontWeight: '600' },
  proctorActions: { alignItems: 'flex-end', gap: Spacing.one },
  upiBtn: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  sheetTitle: { fontSize: 22 },
  sheetSub: { marginBottom: Spacing.two },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetActionText: { flex: 1, gap: 4 },
  statusDesc: {},
  cancelWrap: { marginTop: Spacing.three },
  allDone: { textAlign: 'center', paddingVertical: Spacing.three },
  completedToggle: {
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    marginTop: Spacing.one,
  },
});