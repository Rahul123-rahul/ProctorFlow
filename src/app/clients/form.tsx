import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ClientLogo } from '@/components/ClientLogo';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { createClient, getClient, updateClient } from '@/db/clients';

export default function ClientFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const isEdit = id !== null;

  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; rate?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === null) return;
    getClient(id).then((c) => {
      if (!c) return;
      setName(c.name);
      setRate(String(c.rate_per_proctor));
      setNotes(c.notes ?? '');
      setLogoUrl(c.logo_url ?? '');
    });
  }, [id]);

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = 'Name is required';
    const rateValue = rate.trim() === '' ? 0 : Number(rate);
    if (Number.isNaN(rateValue) || rateValue < 0) nextErrors.rate = 'Enter a valid rate';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const input = { name, rate_per_proctor: rateValue, notes, logo_url: logoUrl };
      if (isEdit) {
        await updateClient(id, input);
      } else {
        await createClient(input);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        <Button title={isEdit ? 'Save changes' : 'Add client'} onPress={handleSave} loading={saving} />
      }>
      <Stack.Screen options={{ title: isEdit ? 'Edit Client' : 'New Client' }} />
      <Field
        label="Client name"
        required
        value={name}
        onChangeText={setName}
        placeholder="e.g. Samsung"
        error={errors.name}
        autoCapitalize="words"
      />
      <Field
        label="Rate per proctor (₹)"
        value={rate}
        onChangeText={setRate}
        placeholder="e.g. 1200"
        keyboardType="numeric"
        error={errors.rate}
      />
      <View style={styles.logoRow}>
        <ClientLogo name={name || '?'} logoUrl={logoUrl} size={48} />
        <View style={styles.logoField}>
          <Field
            label="Logo URL"
            value={logoUrl}
            onChangeText={setLogoUrl}
            placeholder="Leave blank for auto / initials"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Samsung and Superset get a logo automatically. For others, paste an image URL or leave blank
        to show initials.
      </ThemedText>
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
        multiline
        numberOfLines={3}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-end' },
  logoField: { flex: 1 },
});