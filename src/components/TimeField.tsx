import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime12 } from '@/utils/format';

interface TimeFieldProps {
  label: string;
  value: string; // stored as 24-hour "HH:mm" (or empty)
  onChange: (next: string) => void;
  required?: boolean;
  error?: string | null;
  placeholder?: string;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 24-hour "HH:mm" for storage. */
function toStored(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Parses stored "HH:mm" (or legacy "hh:mm AM/PM") into a Date; now if unparseable. */
function timeToDate(value: string): Date {
  const d = new Date();
  const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (ampm) {
    let h = parseInt(ampm[1], 10) % 12;
    if (/pm/i.test(ampm[3])) h += 12;
    d.setHours(h, parseInt(ampm[2], 10), 0, 0);
    return d;
  }
  const h24 = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (h24) d.setHours(parseInt(h24[1], 10), parseInt(h24[2], 10), 0, 0);
  return d;
}

/** Tap to open the native time picker (12-hour AM/PM). Emits "hh:mm AM/PM". */
export function TimeField({
  label,
  value,
  onChange,
  required,
  error,
  placeholder = 'Select time',
}: TimeFieldProps) {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const dateObj = timeToDate(value);

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setShow(false);
    if (event.type === 'set' && selected) onChange(toStored(selected));
  }

  function handleIosChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) onChange(toStored(selected));
  }

  const display = formatTime12(value);

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
        <ThemedText themeColor={display ? 'text' : 'textSecondary'} style={styles.triggerText}>
          {display || placeholder}
        </ThemedText>
        <ThemedText style={{ color: theme.tint, fontWeight: '600' }}>
          {value ? 'Change' : 'Pick'}
        </ThemedText>
      </Pressable>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      {/* Android opens a native clock dialog when the picker mounts. */}
      {show && Platform.OS !== 'ios' ? (
        <DateTimePicker value={dateObj} mode="time" is24Hour={false} onChange={handleAndroidChange} />
      ) : null}

      {/* iOS: present the spinner in a sheet with a Done button. */}
      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShow(false)}>
            <Pressable
              style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={(e) => e.stopPropagation()}>
              <DateTimePicker
                value={dateObj}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleIosChange}
              />
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