import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { BrandFooter } from '@/components/BrandFooter';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      const ok = await signIn(email, password);
      if (!ok) setError('Incorrect email or password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.inner}>
              <View style={styles.header}>
                <BrandLogo size={96} />
                <ThemedText type="title" style={styles.title}>
                  {Brand.name}
                </ThemedText>
                <ThemedText themeColor="textSecondary">{Brand.tagline}</ThemedText>
              </View>

              <View style={styles.form}>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry
                  autoCapitalize="none"
                  onSubmitEditing={handleSignIn}
                  returnKeyType="go"
                />
                {error ? (
                  <ThemedText type="small" themeColor="danger">
                    {error}
                  </ThemedText>
                ) : null}
                <Button title="Sign in" onPress={handleSignIn} loading={busy} />
              </View>

              <BrandFooter />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  header: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  title: { fontSize: 36, textAlign: 'center' },
  form: { gap: Spacing.three },
});