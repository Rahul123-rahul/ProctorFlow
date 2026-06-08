import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { ClientLogo } from '@/components/ClientLogo';
import { DateField } from '@/components/DateField';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Select, type SelectOption } from '@/components/Select';
import { TimeField } from '@/components/TimeField';
import { listClients } from '@/db/clients';
import { getEvent, updateEventHeader } from '@/db/events';
import { defaultEventName, isValidISODate } from '@/utils/format';

/** Edits an existing event's header fields. Proctors are managed on the detail screen. */
export default function EventEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);

  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientOptions, setClientOptions] = useState<SelectOption[]>([]);
  const [loginTime, setLoginTime] = useState('');
  const [logoutTime, setLogoutTime] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ date?: string; client?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listClients().then((rows) =>
      setClientOptions(
        rows.map((c) => ({
          id: c.id,
          label: c.name,
          leading: <ClientLogo name={c.name} logoUrl={c.logo_url} size={28} />,
        }))
      )
    );
  }, []);

  useEffect(() => {
    getEvent(id).then((e) => {
      if (!e) return;
      setEventName(e.event_name ?? '');
      setClientId(e.client_id);
      setDate(e.event_date);
      setLoginTime(e.login_time ?? '');
      setLogoutTime(e.logout_time ?? '');
      setHeadcount(e.headcount != null ? String(e.headcount) : '');
      setNotes(e.notes ?? '');
    });
  }, [id]);

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (!isValidISODate(date)) nextErrors.date = 'Enter a valid date (YYYY-MM-DD)';
    if (clientId === null) nextErrors.client = 'Pick a client';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await updateEventHeader(id, {
        client_id: clientId!,
        event_name: eventName,
        event_date: date,
        login_time: loginTime,
        logout_time: logoutTime,
        headcount: headcount.trim() === '' ? null : Number(headcount),
        notes,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen footer={<Button title="Save changes" onPress={handleSave} loading={saving} />}>
      <Stack.Screen options={{ title: 'Edit Event' }} />
      <DateField label="Date" required value={date} onChange={setDate} error={errors.date} />
      <Select
        label="Client"
        required
        options={clientOptions}
        value={clientId}
        onChange={setClientId}
        placeholder="Pick a client"
        error={errors.client}
      />
      <TimeField label="Login time" value={loginTime} onChange={setLoginTime} />
      <TimeField label="Logout time" value={logoutTime} onChange={setLogoutTime} />
      <Field
        label="Proctors required (headcount)"
        value={headcount}
        onChangeText={setHeadcount}
        placeholder="e.g. 10"
        keyboardType="number-pad"
      />
      <Field
        label="Event name (optional)"
        value={eventName}
        onChangeText={setEventName}
        placeholder={
          clientId !== null && isValidISODate(date)
            ? defaultEventName(date, clientOptions.find((o) => o.id === clientId)?.label ?? '')
            : 'Auto-named from date + client'
        }
        autoCapitalize="words"
      />
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