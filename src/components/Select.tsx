import { type ReactNode, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectOption {
  id: number;
  label: string;
  sublabel?: string;
  leading?: ReactNode; // optional element shown before the label (e.g. a logo)
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  emptyText?: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  required,
  error,
  emptyText = 'No options available',
}: SelectProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) ?? null;

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
        {required ? <ThemedText themeColor="danger"> *</ThemedText> : null}
      </ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.danger : theme.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <View style={styles.triggerInner}>
          {selected?.leading}
          <ThemedText themeColor={selected ? 'text' : 'textSecondary'} style={styles.triggerText}>
            {selected ? selected.label : placeholder}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">▾</ThemedText>
      </Pressable>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sheetTitle}>
              {label}
            </ThemedText>
            {options.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {emptyText}
              </ThemedText>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(o) => String(o.id)}
                renderItem={({ item }) => {
                  const isSelected = item.id === value;
                  return (
                    <Pressable
                      onPress={() => {
                        onChange(item.id);
                        setOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        { borderBottomColor: theme.border },
                        (pressed || isSelected) && { backgroundColor: theme.backgroundElement },
                      ]}>
                      {item.leading}
                      <View style={styles.optionText}>
                        <ThemedText>{item.label}</ThemedText>
                        {item.sublabel ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {item.sublabel}
                          </ThemedText>
                        ) : null}
                      </View>
                      {isSelected ? <ThemedText style={{ color: theme.tint }}>✓</ThemedText> : null}
                    </Pressable>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  triggerInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  triggerText: { flex: 1, fontSize: 16 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '70%',
    paddingVertical: Spacing.two,
  },
  sheetTitle: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  empty: { padding: Spacing.four, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { flex: 1, gap: 2 },
});