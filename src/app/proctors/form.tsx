import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { createProctor, getProctor, updateProctor } from '@/db/proctors';

export default function ProctorFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const isEdit = id !== null;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [govtId, setGovtId] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === null) return;
    getProctor(id).then((p) => {
      if (!p) return;
      setFullName(p.full_name);
      setPhone(p.phone);
      setGovtId(p.govt_id ?? '');
      setEmail(p.email ?? '');
      setUpiId(p.upi_id ?? '');
    });
  }, [id]);

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (!fullName.trim()) nextErrors.fullName = 'Name is required';
    if (!phone.trim()) nextErrors.phone = 'Phone is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const input = { full_name: fullName, phone, govt_id: govtId, email, upi_id: upiId };
      if (isEdit) {
        await updateProctor(id, input);
      } else {
        await createProctor(input);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        <Button title={isEdit ? 'Save changes' : 'Add proctor'} onPress={handleSave} loading={saving} />
      }>
      <Stack.Screen options={{ title: isEdit ? 'Edit Proctor' : 'New Proctor' }} />
      <Field
        label="Full name"
        required
        value={fullName}
        onChangeText={setFullName}
        placeholder="e.g. Ravi Kumar"
        error={errors.fullName}
        autoCapitalize="words"
      />
      <Field
        label="Phone"
        required
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. 98765 43210"
        keyboardType="phone-pad"
        error={errors.phone}
      />
      <Field
        label="Government ID"
        value={govtId}
        onChangeText={setGovtId}
        placeholder="ID number (optional)"
        autoCapitalize="characters"
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com (optional)"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label="UPI ID"
        value={upiId}
        onChangeText={setUpiId}
        placeholder="e.g. name@oksbi (for Pay via UPI)"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </Screen>
  );
}