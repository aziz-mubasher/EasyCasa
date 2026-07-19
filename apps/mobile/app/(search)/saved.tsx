import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { AlertFrequency, AlertSavedSearch } from '@easycasa/api-client';
import {
  useDiscoverySavedSearches,
  useRemoveSavedSearch,
  useSetSavedSearchFrequency,
} from '../../src/api/discovery-hooks';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';

const FREQS: AlertFrequency[] = ['instant', 'daily', 'off'];

export default function SavedSearchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useDiscoverySavedSearches();
  const setFreq = useSetSavedSearchFrequency();
  const remove = useRemoveSavedSearch();

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 24 }}>
          {t('discovery.saved.signIn')}
        </Text>
        <Pressable
          onPress={() => router.push('/(auth)/sign-in')}
          style={[styles.signIn, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
        >
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('auth.signIn')}</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const items = data ?? [];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
          {t('discovery.saved.empty')}
        </Text>
      ) : (
        items.map((ss: AlertSavedSearch) => (
          <View
            key={ss.id}
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
            ]}
          >
            <View style={styles.cardHead}>
              <Text style={[styles.name, { color: theme.colors.text }]}>{ss.name}</Text>
              <Pressable onPress={() => remove.mutate(ss.id)} hitSlop={8}>
                <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600' }}>
                  {t('common.delete')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.freqRow}>
              {FREQS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFreq.mutate({ id: ss.id, frequency: f })}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        ss.frequency === f ? theme.colors.primary : theme.colors.background,
                      borderRadius: theme.radius.sm,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: ss.frequency === f ? theme.colors.primaryText : theme.colors.text,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {t(`discovery.freq.${f}`)}
                  </Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  signIn: { paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  content: { padding: 16 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  card: { padding: 14, marginBottom: 12, gap: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700' },
  freqRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
});
