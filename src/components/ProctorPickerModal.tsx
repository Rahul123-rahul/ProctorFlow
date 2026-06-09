import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface PickerOption {
  id: number;
  label: string;
  sublabel?: string;
}

interface BaseProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: PickerOption[];
  emptyText?: string;
}

type Props =
  | (BaseProps & { mode: 'multi'; onConfirm: (ids: number[]) => void })
  | (BaseProps & { mode: 'single'; onPick: (id: number) => void });

/**
 * A bottom-sheet proctor picker whose list owns its own scroll (FlatList with a
 * bounded sheet height — not nested in a ScrollView). Multi-select adds an
 * "Add N" confirm button; single-select picks on tap.
 */
export function ProctorPickerModal(props: Props) {
  const { visible, onClose, title, subtitle, options, emptyText = 'No proctors available' } = props;
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);

  // Reset search + selection each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setSearch('');
      setSelected([]);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(t) || (o.sublabel ?? '').toLowerCase().includes(t)
    );
  }, [options, search]);

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          ) : null}

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or phone"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            style={[
              styles.search,
              { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          />

          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.id)}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {emptyText}
              </ThemedText>
            }
            renderItem={({ item }) => {
              const isSelected = props.mode === 'multi' && selected.includes(item.id);
              return (
                <Pressable
                  onPress={() => (props.mode === 'multi' ? toggle(item.id) : props.onPick(item.id))}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: theme.border },
                    (pressed || isSelected) && { backgroundColor: theme.backgroundElement },
                  ]}>
                  {props.mode === 'multi' ? (
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? theme.tint : theme.border,
                          backgroundColor: isSelected ? theme.tint : 'transparent',
                        },
                      ]}>
                      {isSelected ? (
                        <ThemedText style={{ color: theme.onTint, fontSize: 14 }}>✓</ThemedText>
                      ) : null}
                    </View>
                  ) : null}
                  <View style={styles.rowText}>
                    <ThemedText>{item.label}</ThemedText>
                    {item.sublabel ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.sublabel}
                      </ThemedText>
                    ) : null}
                  </View>
                  {props.mode === 'single' ? (
                    <ThemedText style={{ color: theme.tint, fontWeight: '600' }}>Replace ›</ThemedText>
                  ) : null}
                </Pressable>
              );
            }}
          />

          {props.mode === 'multi' ? (
            <Button
              title={
                selected.length > 0
                  ? `Add ${selected.length} proctor${selected.length === 1 ? '' : 's'}`
                  : 'Add'
              }
              onPress={() => props.onConfirm(selected)}
              disabled={selected.length === 0}
            />
          ) : null}
          <View style={styles.cancel}>
            <Button title="Cancel" variant="secondary" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    maxHeight: '85%',
    gap: Spacing.two,
  },
  title: { fontSize: 22 },
  subtitle: {},
  search: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    minHeight: 48,
  },
  // flexShrink lets the list shrink within the capped sheet height so it scrolls.
  list: { flexGrow: 0, flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Spacing.one,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
  cancel: {},
});