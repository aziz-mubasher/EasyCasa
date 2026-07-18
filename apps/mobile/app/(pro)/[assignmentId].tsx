import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { ProAssignment } from '@easycasa/api-client';
import { useMyAssignments, useStart, useDeliver } from '../../src/api/professional-hooks';
import { pickAndUploadDocument } from '../../src/api/upload';
import { useAuth } from '../../src/auth/AuthProvider';
import { StatusPill } from '../../src/components/pro/StatusPill';
import { useTheme } from '../../src/theme/useTheme';

type Theme = ReturnType<typeof useTheme>;

function ActionButton({
  label,
  onPress,
  busy,
  theme,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.action, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
    >
      {busy ? (
        <ActivityIndicator color={theme.colors.primaryText} />
      ) : (
        <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{label}</Text>
      )}
    </Pressable>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

export default function AssignmentDetail() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAccessToken } = useAuth();
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const id = assignmentId ?? '';

  const { data, isLoading } = useMyAssignments();
  const start = useStart();
  const deliver = useDeliver();
  const [uploading, setUploading] = useState(false);

  const assignment: ProAssignment | undefined = (data ?? []).find((a) => a.id === id);

  const onDeliver = async () => {
    try {
      setUploading(true);
      const uploaded = await pickAndUploadDocument(getAccessToken);
      if (!uploaded) return;
      await deliver.mutateAsync({ assignmentId: id, deliverableUrl: uploaded.url });
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <ActivityIndicator style={styles.center} color={theme.colors.primary} />;
  if (!assignment) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.danger }}>{t('common.error')}</Text>
      </View>
    );
  }

  const task = assignment.task;

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.headRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {task ? task.itemCode : assignment.taskId}
        </Text>
        <StatusPill status={assignment.status} />
      </View>

      {task ? (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
          <Row label={t('pro.detail.property')} value={task.propertyId} theme={theme} />
          <Row label={t('pro.detail.credential')} value={task.requiredCredential} theme={theme} />
          <Row label={t('pro.detail.province')} value={task.province} theme={theme} />
        </View>
      ) : null}

      {assignment.status === 'ASSIGNED' ? (
        <ActionButton label={t('pro.detail.start')} busy={start.isPending} onPress={() => start.mutate(id)} theme={theme} />
      ) : null}

      {assignment.status === 'IN_PROGRESS' ? (
        <ActionButton label={t('pro.detail.deliver')} busy={uploading} onPress={onDeliver} theme={theme} />
      ) : null}

      {assignment.deliverableUrl ? (
        <Text style={[styles.delivered, { color: theme.colors.primary }]}>{t('pro.card.delivered')}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', flex: 1 },
  card: { padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '600' },
  action: { paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  delivered: { fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },
});
