import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, formatMonth } from '@/utils/format';

interface MonthSelectorProps {
  period: string; // YYYY-MM
  onChange: (next: string) => void;
}

export function MonthSelector({ period, onChange }: MonthSelectorProps) {
  const theme = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Arrow label="‹" onPress={() => onChange(addMonths(period, -1))} />
      <ThemedText type="subtitle" style={styles.label}>
        {formatMonth(period)}
      </ThemedText>
      <Arrow label="›" onPress={() => onChange(addMonths(period, 1))} />
    </View>
  );
}

function Arrow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, { opacity: pressed ? 0.5 : 1 }]}>
      <ThemedText style={[styles.arrowText, { color: theme.tint }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  label: { fontSize: 24 },
  arrow: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  arrowText: { fontSize: 32, fontWeight: '700', lineHeight: 36 },
});