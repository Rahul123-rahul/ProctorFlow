import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

const LIVE_RED = '#E11D48';

/**
 * A blinking red "LIVE" pill for events happening today. Uses only React Native's
 * built-in Animated API (no reanimated) so it's SDK 54 / Expo Go compatible.
 */
export function LiveBadge() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop(); // clean up on unmount to avoid leaks
  }, [opacity]);

  return (
    <Animated.View style={[styles.pill, { opacity }]}>
      <View style={styles.dot} />
      <Text style={styles.text}>LIVE</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: LIVE_RED,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
  text: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});