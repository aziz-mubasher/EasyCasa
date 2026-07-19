import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { Slot } from '@easycasa/api-client';
import { useBookViewing, useSlots } from '../../src/api/viewings';
import { useTheme } from '../../src/theme/useTheme';

const DAY_MS = 86_400_000;

function dayKey(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function BookViewingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { listingId, enquiryId } = useLocalSearchParams<{ listingId: string; enquiryId?: string }>();
  const id = listingId ?? '';

  const from = Date.now();
  const to = from + 30 * DAY_MS;
  const { data: slots, isLoading } = useSlots(id, from, to);
  const book = useBookViewing(id);
  const [booked, setBooked] = useState<number | null>(null);

  // Group slots by day for a clean picker.
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const k = dayKey(s.startMs);
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [slots]);

  const onBook = (slot: Slot) => {
    book.mutate(
      { startMs: slot.startMs, ...(enquiryId ? { enquiryId } : {}) },
      {
        onSuccess: () => setBooked(slot.startMs),
        onError: (e) => Alert.alert(t('viewings.error'), e.message),
      },
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (booked !== null) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.doneH, { color: theme.colors.primary }]}>{t('viewings.requested')}</Text>
        <Text style={[styles.doneSub, { color: theme.colors.textMuted }]}>
          {dayKey(booked)} · {timeLabel(booked)}
        </Text>
        <Text style={[styles.doneNote, { color: theme.colors.textMuted }]}>{t('viewings.awaitingConfirm')}</Text>
        <Pressable onPress={() => router.back()} style={[styles.cta, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}>
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('viewings.done')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.h, { color: theme.colors.text }]}>{t('viewings.title')}</Text>

      {byDay.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('viewings.noSlots')}</Text>
      ) : (
        byDay.map(([day, daySlots]) => (
          <View key={day} style={styles.dayBlock}>
            <Text style={[styles.day, { color: theme.colors.textMuted }]}>{day}</Text>
            <View style={styles.slotWrap}>
              {daySlots.map((s) => (
                <Pressable
                  key={s.startMs}
                  onPress={() => onBook(s)}
                  disabled={book.isPending}
                  style={[styles.slot, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>{timeLabel(s.startMs)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  content: { padding: 16, paddingBottom: 40 },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  dayBlock: { marginBottom: 18 },
  day: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  doneH: { fontSize: 20, fontWeight: '800' },
  doneSub: { fontSize: 15, fontWeight: '600' },
  doneNote: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  cta: { paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center', marginTop: 16 },
});
