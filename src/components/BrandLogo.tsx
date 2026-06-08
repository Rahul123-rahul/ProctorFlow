import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

/** Circular ProConnectify logo loaded remotely, falling back to "PC" initials. */
export function BrandLogo({ size = 72 }: { size?: number }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderColor: theme.border,
  };

  if (failed) {
    return (
      <View style={[styles.box, box, { backgroundColor: theme.tint }]}>
        <ThemedText style={[styles.initials, { color: theme.onTint, fontSize: size * 0.36 }]}>
          PC
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.box, box, { backgroundColor: '#ffffff' }]}>
      <Image
        source={{ uri: Brand.logoUrl }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="disk"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: { width: '100%', height: '100%' },
  initials: { fontWeight: '800', letterSpacing: 1 },
});