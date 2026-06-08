/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0E1726',
    background: '#EAF1FD',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#DBE6FA',
    textSecondary: '#586173',
    tint: '#1E63E9',
    tintMuted: '#D8E6FE',
    border: '#D3DFF1',
    success: '#1A9850',
    successMuted: '#E5F4EB',
    warning: '#B7791F',
    warningMuted: '#FBF1DC',
    danger: '#D7263D',
    dangerMuted: '#FBE7EA',
    onTint: '#ffffff',
  },
  dark: {
    text: '#ffffff',
    background: '#0B111E',
    backgroundElement: '#161E2E',
    backgroundSelected: '#202A3D',
    textSecondary: '#AEB6C6',
    tint: '#5B8DEF',
    tintMuted: '#16294A',
    border: '#28324A',
    success: '#46C77F',
    successMuted: '#10241A',
    warning: '#E0B04A',
    warningMuted: '#2A2410',
    danger: '#F36B7C',
    dangerMuted: '#2E1216',
    onTint: '#ffffff',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
