import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { EventPaymentStatus, EventStatus, PaymentStatus } from '@/db/types';

type Tone = 'neutral' | 'tint' | 'success' | 'warning' | 'danger';

const EVENT_TONE: Record<EventStatus, Tone> = {
  scheduled: 'tint',
  completed: 'success',
  no_show: 'danger',
  cancelled: 'neutral',
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};

// pending = amber, cleared = green, settled = blue, on_hold = red.
const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  pending: 'warning',
  cleared: 'success',
  settled: 'tint',
  on_hold: 'danger',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pending',
  cleared: 'Cleared',
  settled: 'Settled',
  on_hold: 'On Hold',
};

// Event payment status: open = grey, completed = green.
const EVENT_PAYMENT_TONE: Record<EventPaymentStatus, Tone> = {
  open: 'neutral',
  completed: 'success',
};

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const map: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: c.backgroundSelected, fg: c.textSecondary },
    tint: { bg: c.tintMuted, fg: c.tint },
    success: { bg: c.successMuted, fg: c.success },
    warning: { bg: c.warningMuted, fg: c.warning },
    danger: { bg: c.dangerMuted, fg: c.danger },
  };
  const { bg, fg } = map[tone];

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <ThemedText type="smallBold" style={{ color: fg }}>
        {label}
      </ThemedText>
    </View>
  );
}

export function EventStatusPill({ status }: { status: EventStatus }) {
  return <StatusPill label={EVENT_STATUS_LABEL[status]} tone={EVENT_TONE[status]} />;
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return <StatusPill label={PAYMENT_STATUS_LABEL[status]} tone={PAYMENT_TONE[status]} />;
}

export function EventPaymentStatusPill({ status }: { status: EventPaymentStatus }) {
  return (
    <StatusPill label={status === 'completed' ? 'Completed' : 'Open'} tone={EVENT_PAYMENT_TONE[status]} />
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});