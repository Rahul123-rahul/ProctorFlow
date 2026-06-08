import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ClientLogo } from '@/components/ClientLogo';
import { MultiSelect } from '@/components/MultiSelect';
import { Screen } from '@/components/Screen';
import { EVENT_STATUS_LABEL, EventStatusPill } from '@/components/StatusPill';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import {
  addProctorsToEvent,
  deleteEvent,
  getEvent,
  removeEventProctor,
  replaceEventProctor,
  setEventStatus,
} from '@/db/events';
import { listActiveProctors } from '@/db/proctors';
import type { EventDetail, EventProctorView, EventStatus } from '@/db/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { eventDisplayName, formatDate, formatTime12 } from '@/utils/format';

/** Builds the WhatsApp-ready proctor list (bold via *asterisks*). */
function buildProctorListMessage(event: EventDetail): string {
  // The display name already includes the date for auto-named events.
  const header = `*${eventDisplayName(event.event_name, event.event_date, event.client_name)}*`;
  const blocks = event.proctors.map(
    (p) =>
      `*Name:* ${p.proctor_name}\n*Phone Number:* ${p.phone}\n*Email ID:* ${p.email ?? '-'}`
  );
  const parts = [header, '', blocks.join('\n\n')];
  const timings: string[] = [];
  if (event.login_time) timings.push(`*Login Time:* ${formatTime12(event.login_time)}`);
  if (event.logout_time) timings.push(`*Logout Time:* ${formatTime12(event.logout_time)}`);
  if (timings.length) parts.push('', timings.join('\n'));
  return parts.join('\n');
}

const STATUSES: EventStatus[] = ['scheduled', 'completed', 'no_show', 'cancelled'];

export default function EventDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);

  const [event, setEvent] = useState<EventDetail | null>(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const [actionFor, setActionFor] = useState<EventProctorView | null>(null);
  const [replaceFor, setReplaceFor] = useState<EventProctorView | null>(null);
  const [replaceOptions, setReplaceOptions] = useState<{ id: number; label: string; sublabel?: string }[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addOptions, setAddOptions] = useState<{ id: number; label: string; sublabel?: string }[]>([]);
  const [addSelected, setAddSelected] = useState<number[]>([]);
  const [addSearch, setAddSearch] = useState('');

  const reload = useCallback(() => {
    let active = true;
    getEvent(id).then((e) => active && setEvent(e));
    return () => {
      active = false;
    };
  }, [id]);

  useFocusEffect(reload);

  const assignedIds = event?.proctors.map((p) => p.proctor_id) ?? [];

  async function changeStatus(status: EventStatus) {
    setStatusOpen(false);
    await setEventStatus(id, status);
    reload();
  }

  // ---- Add proctors ----
  function openAdd() {
    setAddSelected([]);
    setAddSearch('');
    listActiveProctors().then((rows) => {
      setAddOptions(
        rows
          .filter((p) => !assignedIds.includes(p.id))
          .map((p) => ({ id: p.id, label: p.full_name, sublabel: p.phone }))
      );
      setAddOpen(true);
    });
  }
  async function confirmAdd() {
    if (addSelected.length > 0) await addProctorsToEvent(id, addSelected);
    setAddOpen(false);
    reload();
  }

  // ---- Remove / Replace ----
  function confirmRemove(ep: EventProctorView) {
    setActionFor(null);
    Alert.alert('Remove proctor?', `Remove ${ep.proctor_name} from this event?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeEventProctor(ep.id);
          reload();
        },
      },
    ]);
  }
  function openReplace(ep: EventProctorView) {
    setActionFor(null);
    listActiveProctors().then((rows) => {
      setReplaceOptions(
        rows
          .filter((p) => !assignedIds.includes(p.id))
          .map((p) => ({ id: p.id, label: p.full_name, sublabel: p.phone }))
      );
      setReplaceFor(ep);
    });
  }
  async function doReplace(newProctorId: number) {
    if (!replaceFor) return;
    await replaceEventProctor(replaceFor.id, newProctorId);
    setReplaceFor(null);
    reload();
  }

  async function handleShare() {
    if (!event) return;
    await Share.share({
      title: `${event.client_name} proctor list`,
      message: buildProctorListMessage(event),
    });
  }

  function confirmDelete() {
    Alert.alert('Delete event?', 'This permanently deletes the event and all its proctor assignments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEvent(id);
          router.back();
        },
      },
    ]);
  }

  if (!event) {
    return (
      <Screen scroll={false}>
        <View />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: eventDisplayName(event.event_name, event.event_date, event.client_name),
          headerRight: () => (
            <HeaderText label="Edit" onPress={() => router.push({ pathname: '/events/form', params: { id } })} />
          ),
        }}
      />

      {/* Header / properties */}
      <Card>
        <View style={styles.headerTop}>
          <ClientLogo name={event.client_name} logoUrl={event.client_logo_url} size={44} />
          <ThemedText type="subtitle" style={styles.client}>
            {eventDisplayName(event.event_name, event.event_date, event.client_name)}
          </ThemedText>
          <EventStatusPill status={event.status} />
        </View>
        <InfoRow label="Client" value={event.client_name} />
        <InfoRow label="Date" value={formatDate(event.event_date)} />
        <InfoRow label="Login time" value={formatTime12(event.login_time) || null} />
        <InfoRow label="Logout time" value={formatTime12(event.logout_time) || null} />
        <InfoRow
          label="Headcount"
          value={event.headcount != null ? `${event.headcount} required` : null}
        />
        <InfoRow label="Notes" value={event.notes} />
      </Card>

      <Button title="Share the details to client" onPress={handleShare} />
      <Button title="Change status" variant="secondary" onPress={() => setStatusOpen(true)} />

      {/* Proctors */}
      <View style={styles.sectionHead}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          PROCTORS ({event.proctors.length}
          {event.headcount != null ? ` of ${event.headcount}` : ''})
        </ThemedText>
        <HeaderText label="+ Add" onPress={openAdd} />
      </View>

      {event.proctors.length === 0 ? (
        <ThemedText themeColor="textSecondary">No proctors yet. Tap “+ Add”.</ThemedText>
      ) : (
        event.proctors.map((ep) => (
          <Card key={ep.id} onPress={() => setActionFor(ep)}>
            <View style={styles.proctorRow}>
              <View style={styles.proctorText}>
                <ThemedText style={styles.proctorName}>{ep.proctor_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {ep.phone}
                </ThemedText>
                {ep.replaced_proctor_name ? (
                  <ThemedText type="small" style={{ color: theme.tint }}>
                    {ep.proctor_name} replaced {ep.replaced_proctor_name}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 22 }}>⋯</ThemedText>
            </View>
          </Card>
        ))
      )}

      <View style={styles.deleteWrap}>
        <Button title="Delete event" variant="danger" onPress={confirmDelete} />
      </View>

      {/* Status picker */}
      <BottomSheet visible={statusOpen} onClose={() => setStatusOpen(false)}>
        <ThemedText type="subtitle" style={styles.sheetTitle}>
          Event status
        </ThemedText>
        {STATUSES.map((s) => (
          <SheetAction
            key={s}
            label={EVENT_STATUS_LABEL[s]}
            tone={s === event.status ? 'tint' : undefined}
            onPress={() => changeStatus(s)}
          />
        ))}
      </BottomSheet>

      {/* Proctor action (remove / replace) */}
      <BottomSheet visible={actionFor !== null} onClose={() => setActionFor(null)}>
        {actionFor ? (
          <>
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              {actionFor.proctor_name}
            </ThemedText>
            <SheetAction label="Replace proctor" tone="tint" onPress={() => openReplace(actionFor)} />
            <SheetAction label="Remove from event" tone="danger" onPress={() => confirmRemove(actionFor)} />
          </>
        ) : null}
      </BottomSheet>

      {/* Replace picker */}
      <BottomSheet visible={replaceFor !== null} onClose={() => setReplaceFor(null)}>
        <ThemedText type="subtitle" style={styles.sheetTitle}>
          Replace {replaceFor?.proctor_name}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.sheetSub}>
          Pick the proctor who went instead
        </ThemedText>
        {replaceOptions.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No other active proctors available.
          </ThemedText>
        ) : (
          replaceOptions.map((o) => (
            <SheetAction key={o.id} label={o.label} sublabel={o.sublabel} onPress={() => doReplace(o.id)} />
          ))
        )}
      </BottomSheet>

      {/* Add proctors */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              Add proctors
            </ThemedText>
            <MultiSelect
              label="Active proctors"
              options={addOptions}
              selected={addSelected}
              onToggle={(pid) =>
                setAddSelected((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]))
              }
              search={addSearch}
              onSearch={setAddSearch}
              emptyText="No more active proctors to add"
            />
            <View style={styles.addActions}>
              <Button
                title={addSelected.length > 0 ? `Add ${addSelected.length}` : 'Add'}
                onPress={confirmAdd}
              />
              <Button title="Cancel" variant="secondary" onPress={() => setAddOpen(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.infoValue}>{value || '—'}</ThemedText>
    </View>
  );
}

function HeaderText({ label, onPress }: { label: string; onPress: () => void }) {
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <ThemedText style={{ color: c.tint, fontSize: 17, fontWeight: '600' }}>{label}</ThemedText>
    </Pressable>
  );
}

function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}>
          {children}
          <View style={styles.cancelWrap}>
            <Button title="Cancel" variant="secondary" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetAction({
  label,
  sublabel,
  onPress,
  tone,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  tone?: 'tint' | 'danger';
}) {
  const theme = useTheme();
  const color = tone === 'tint' ? theme.tint : tone === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetAction,
        { borderTopColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <ThemedText style={[styles.sheetActionText, { color }]}>{label}</ThemedText>
      {sublabel ? (
        <ThemedText type="small" themeColor="textSecondary">
          {sublabel}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  client: { fontSize: 22, flex: 1 },
  infoRow: { flexDirection: 'row', marginTop: Spacing.two, gap: Spacing.two },
  infoLabel: { width: 90 },
  infoValue: { flex: 1 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  proctorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  proctorText: { flex: 1, gap: 2 },
  proctorName: { fontSize: 17, fontWeight: '600' },
  deleteWrap: { marginTop: Spacing.four },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 22 },
  sheetSub: { marginBottom: Spacing.two },
  sheetAction: { paddingVertical: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  sheetActionText: { fontSize: 17 },
  cancelWrap: { marginTop: Spacing.three },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
  addActions: { gap: Spacing.two, marginTop: Spacing.three },
});