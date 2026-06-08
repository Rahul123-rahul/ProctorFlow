import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). Set false for screens with their own FlatList. */
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Element pinned to the bottom (e.g. a primary action button). */
  footer?: ReactNode;
}

export function Screen({ children, scroll = true, contentStyle, footer }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    padding: Spacing.three,
    paddingBottom: Spacing.three + (footer ? 0 : insets.bottom),
  };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, padding, contentStyle]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, padding, contentStyle]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            { borderTopColor: theme.border, paddingBottom: Spacing.three + insets.bottom },
          ]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  footerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});