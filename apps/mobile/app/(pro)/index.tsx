import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Assignment } from '@easycasa/api-client';
import { EasyCasaOrchestrationApi } from '@easycasa/api-client';

import { config } from '../../src/config';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';

/** Dev: set EXPO_PUBLIC_PROFESSIONAL_ID to your professional UUID. */
const PRO_ID = process.env.EXPO_PUBLIC_PROFESSIONAL_ID ?? '';

export default function ProInboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!PRO_ID) {
      setError('Set EXPO_PUBLIC_PROFESSIONAL_ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const api = new EasyCasaOrchestrationApi({
        baseUrl: config.apiBaseUrl,
        getAccessToken,
      });
      setItems(await api.myAssignments(PRO_ID));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading && items.length === 0) {
    return <ActivityIndicator style={styles.center} color={theme.colors.primary} />;
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
    >
      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      {items.length === 0 && !error ? (
        <Text style={{ color: theme.colors.textMuted }}>No assignments yet.</Text>
      ) : null}
      {items.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => router.push(`/(pro)/${a.id}`)}
          style={[styles.row, { borderColor: theme.colors.border }]}
        >
          <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{a.status}</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{a.id.slice(0, 8)}…</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  row: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 4 },
  center: { flex: 1, marginTop: 64 },
});
