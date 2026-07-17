import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { Assignment } from '@easycasa/api-client';
import { EasyCasaOrchestrationApi } from '@easycasa/api-client';

import { config } from '../../src/config';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';
import { pickAndUploadDocument } from '../../src/api/upload';

export default function ProAssignmentDetail() {
  const theme = useTheme();
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const { getAccessToken } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(
    () => new EasyCasaOrchestrationApi({ baseUrl: config.apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );

  const refresh = useCallback(async () => {
    const PRO_ID = process.env.EXPO_PUBLIC_PROFESSIONAL_ID ?? '';
    if (!PRO_ID || !assignmentId) return;
    const list = await api().myAssignments(PRO_ID);
    setAssignment(list.find((a) => a.id === assignmentId) ?? null);
  }, [api, assignmentId]);

  useEffect(() => {
    void refresh().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Error'),
    );
  }, [refresh]);

  const start = async () => {
    if (!assignmentId) return;
    setBusy(true);
    setError(null);
    try {
      setAssignment(await api().start(assignmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const deliver = async () => {
    if (!assignmentId) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await pickAndUploadDocument(getAccessToken);
      if (!uploaded) {
        setBusy(false);
        return;
      }
      setAssignment(await api().deliver(assignmentId, uploaded.url));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  if (!assignment && !error) {
    return <ActivityIndicator style={{ marginTop: 64 }} color={theme.colors.primary} />;
  }

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      {assignment ? (
        <>
          <Text style={[styles.status, { color: theme.colors.text }]}>{assignment.status}</Text>
          <Text style={{ color: theme.colors.textMuted, marginBottom: 16 }}>
            {assignment.id}
          </Text>
          {assignment.status === 'ASSIGNED' ? (
            <Pressable
              onPress={() => void start()}
              disabled={busy}
              style={[styles.btn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>Start</Text>
            </Pressable>
          ) : null}
          {assignment.status === 'IN_PROGRESS' ? (
            <Pressable
              onPress={() => void deliver()}
              disabled={busy}
              style={[styles.btn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>
                Upload deliverable
              </Text>
            </Pressable>
          ) : null}
          {assignment.deliverableUrl ? (
            <Text style={{ color: theme.colors.textMuted, marginTop: 12, fontSize: 12 }}>
              {assignment.deliverableUrl}
            </Text>
          ) : null}
        </>
      ) : null}
      {error ? <Text style={{ color: theme.colors.danger, marginTop: 12 }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  status: { fontSize: 20, fontWeight: '700' },
  btn: { paddingVertical: 14, alignItems: 'center', borderRadius: 8, marginTop: 8 },
});
