import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, isValidISODate, todayISO } from '@/utils/format';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  error?: string | null;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoToDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date();
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Tap to open the native calendar. Defaults to today, and any past or future
 * date can be chosen (no min/max). Stores/emits an ISO YYYY-MM-DD string.
 */
export function DateField({ label, value, onChange, required, error }: DateFieldProps) {
  const theme = useTheme();
  const [show, setShow] = useState(false);

  const current = value && isValidISODate(value) ? value : todayISO();
  const dateObj = isoToDate(current);

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setShow(false);
    if (event.type === 'set' && selected) onChange(dateToISO(selected));
  }

  function handleIosChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) onChange(dateToISO(selected));
  }

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
        {required ? <ThemedText themeColor="danger"> *</ThemedText> : null}
      </ThemedText>

      <Pressable
        onPress={() => setShow(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.danger : theme.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <ThemedText style={styles.triggerText}>{formatDate(current)}</ThemedText>
        <ThemedText style={{ color: theme.tint, fontWeight: '600' }}>Change</ThemedText>
      </Pressable>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      {/* Android opens a native dialog as soon as the picker mounts. */}
      {show && Platform.OS !== 'ios' ? (
        <DateTimePicker value={dateObj} mode="date" display="calendar" onChange={handleAndroidChange} />
      ) : null}

      {/* iOS: present the spinner in a sheet with a Done button. */}
      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShow(false)}>
            <Pressable
              style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={(e) => e.stopPropagation()}>
              <DateTimePicker value={dateObj} mode="date" display="spinner" onChange={handleIosChange} />
              <Button title="Done" onPress={() => setShow(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  trigger: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: { fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});