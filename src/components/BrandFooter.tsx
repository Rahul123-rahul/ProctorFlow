import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ICON_SIZE = 28;

function IconLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      hitSlop={10}
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}>
      {children}
    </Pressable>
  );
}

/** Social links + contact footer, shown on the dashboard and login. */
export function BrandFooter() {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { borderTopColor: theme.border }]}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.connect}>
        CONNECT WITH US
      </ThemedText>
      <View style={styles.row}>
        <IconLink url={Brand.socials.linkedin}>
          <FontAwesome name="linkedin-square" size={ICON_SIZE} color="#0A66C2" />
        </IconLink>
        <IconLink url={Brand.socials.instagram}>
          <FontAwesome name="instagram" size={ICON_SIZE} color="#E4405F" />
        </IconLink>
        <IconLink url={Brand.socials.youtube}>
          <FontAwesome name="youtube-play" size={ICON_SIZE} color="#FF0000" />
        </IconLink>
        <IconLink url={`mailto:${Brand.socials.email}`}>
          <Ionicons name="mail" size={ICON_SIZE} color={theme.tint} />
        </IconLink>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
        © {Brand.name} · {Brand.socials.email}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.two,
  },
  connect: { letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
  },
  iconBtn: { padding: Spacing.two },
  copy: { textAlign: 'center' },
});