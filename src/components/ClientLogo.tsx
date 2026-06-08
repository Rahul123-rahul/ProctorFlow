import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Well-known clients get an auto logo via the Clearbit logo API (by domain).
// The device fetches it once and expo-image caches it on disk for offline use.
const KNOWN_DOMAINS: Record<string, string> = {
  samsung: 'samsung.com',
  superset: 'joinsuperset.com',
};

function clearbit(domain: string): string {
  return `https://logo.clearbit.com/${domain}?size=128`;
}

/** Resolves the best logo URL for a client, or null to show an initials avatar. */
export function resolveClientLogo(name: string, logoUrl?: string | null): string | null {
  if (logoUrl && logoUrl.trim()) return logoUrl.trim();
  const domain = KNOWN_DOMAINS[name.trim().toLowerCase()];
  return domain ? clearbit(domain) : null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface ClientLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: number;
}

export function ClientLogo({ name, logoUrl, size = 40 }: ClientLogoProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const url = resolveClientLogo(name, logoUrl);

  const box = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.22),
  };

  if (url && !failed) {
    return (
      <View style={[styles.box, box, styles.logoBg, { borderColor: theme.border }]}>
        <Image
          source={{ uri: url }}
          style={styles.image}
          contentFit="contain"
          transition={150}
          cachePolicy="disk"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  // Fallback: initials avatar in the brand-muted tint.
  return (
    <View style={[styles.box, box, { backgroundColor: theme.tintMuted, borderColor: theme.border }]}>
      <ThemedText style={[styles.initials, { color: theme.tint, fontSize: size * 0.36 }]}>
        {initials(name)}
      </ThemedText>
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
  logoBg: { backgroundColor: '#ffffff' },
  image: { width: '78%', height: '78%' },
  initials: { fontWeight: '700' },
});