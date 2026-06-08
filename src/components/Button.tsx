import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: ButtonProps) {
  const theme = useTheme();

  const bg =
    variant === 'primary' ? theme.tint : variant === 'danger' ? theme.danger : theme.backgroundElement;
  const fg =
    variant === 'secondary' ? theme.text : theme.onTint;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.inner}>
        {loading ? <ActivityIndicator color={fg} size="small" /> : null}
        <ThemedText style={[styles.label, { color: fg }]}>{title}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});