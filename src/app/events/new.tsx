import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { ClientLogo } from '@/components/ClientLogo';
import { DateField } from '@/components/DateField';
import { Field } from '@/components/Field';
import { MultiSelect } from '@/components/MultiSelect';
import { Screen } from '@/components/Screen';
import { Select, type SelectOption } from '@/components/Select';
import { TimeField } from '@/components/TimeField';
import { listClients } from '@/db/clients';
import { createEvent } from '@/db/events';
import { listActiveProctors } from '@/db/proctors';
import { defaultEventName, isValidISODate, todayISO } from '@/utils/format';

export default function NewEventScreen() {
  const router = useRouter();

  const [eventName, setEventName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientOptions, setClientOptions] = useState<SelectOption[]>([]);
  const [proctorOptions, setProctorOptions] = useState<SelectOption[]>([]);
  const [selectedProctors, setSelectedProctors] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [loginTime, setLoginTime] = useState('');
  const [logoutTime, setLogoutTime] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ date?: string; client?: string; proctors?: string }>({});
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

  // Pre-fill the event name with the auto default, kept in sync with date/client
  // until the user types their own.
  const clientName = clientOptions.find((o) => o.id === clientId)?.label ?? '';
  useEffect(() => {
    if (nameTouched) return;
    setEventName(clientId !== null && isValidISODate(date) ? defaultEventName(date, clientName) : '');
  }, [date, clientId, clientName, nameTouched]);

  useEffect(() => {
    let active = true;
    listActiveProctors(search).then((rows) => {
      if (active) setProctorOptions(rows.map((p) => ({ id: p.id, label: p.full_name, sublabel: p.phone })));
    });
    return () => {
      active = false;
    };
  }, [search]);

  function toggleProctor(id: number) {
    setSelectedProctors((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (!isValidISODate(date)) nextErrors.date = 'Enter a valid date (YYYY-MM-DD)';
    if (clientId === null) nextErrors.client = 'Pick a client';
    if (selectedProctors.length === 0) nextErrors.proctors = 'Select at least one proctor';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const id = await createEvent({
        client_id: clientId!,
        proctor_ids: selectedProctors,
        // Store null when the user didn't customize, so the name stays auto-derived.
        event_name: nameTouched ? eventName : null,
        event_date: date,
        login_time: loginTime,
        logout_time: logoutTime,
        headcount: headcount.trim() === '' ? null : Number(headcount),
        notes,
      });
      // Go straight to the new event so the user can manage/edit it.
      router.replace({ pathname: '/events/[id]', params: { id } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen footer={<Button title="Create event" onPress={handleSave} loading={saving} />}>
      <DateField label="Date" required value={date} onChange={setDate} error={errors.date} />
      <Select
        label="Client"
        required
        options={clientOptions}
        value={clientId}
        onChange={setClientId}
        placeholder="Pick a client"
        error={errors.client}
        emptyText="No clients — add one first"
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
      <MultiSelect
        label="Proctors"
        required
        options={proctorOptions}
        selected={selectedProctors}
        onToggle={toggleProctor}
        search={search}
        onSearch={setSearch}
        error={errors.proctors}
        emptyText="No active proctors — add one first"
      />
      <Field
        label="Event name (optional)"
        value={eventName}
        onChangeText={(t) => {
          setNameTouched(true);
          setEventName(t);
        }}
        placeholder="Auto-named from date + client"
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