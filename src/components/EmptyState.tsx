import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {hint ? (
        <ThemedText themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  title: { fontSize: 22, textAlign: 'center' },
  hint: { textAlign: 'center' },
});