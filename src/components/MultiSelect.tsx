import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { SelectOption } from '@/components/Select';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MultiSelectProps {
  label: string;
  options: SelectOption[];
  selected: number[];
  onToggle: (id: number) => void;
  required?: boolean;
  error?: string | null;
  search: string;
  onSearch: (text: string) => void;
  emptyText?: string;
}

/** Inline multi-select list with a search box — used to pick proctors for a deployment. */
export function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  required,
  error,
  search,
  onSearch,
  emptyText = 'No proctors found',
}: MultiSelectProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
        {required ? <ThemedText themeColor="danger"> *</ThemedText> : null}
        {selected.length > 0 ? (
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {'  '}
            {selected.length} selected
          </ThemedText>
        ) : null}
      </ThemedText>

      <TextInput
        value={search}
        onChangeText={onSearch}
        placeholder="Search by name or phone"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.search,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      />

      <View style={[styles.list, { borderColor: error ? theme.danger : theme.border }]}>
        {options.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {emptyText}
          </ThemedText>
        ) : (
          options.map((o, i) => {
            const isSelected = selected.includes(o.id);
            return (
              <Pressable
                key={o.id}
                onPress={() => onToggle(o.id)}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { backgroundColor: theme.backgroundElement },
                ]}>
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
                <View style={styles.rowText}>
                  <ThemedText>{o.label}</ThemedText>
                  {o.sublabel ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {o.sublabel}
                    </ThemedText>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </View>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  search: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    minHeight: 48,
  },
  list: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  empty: { padding: Spacing.four, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Spacing.one,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
});