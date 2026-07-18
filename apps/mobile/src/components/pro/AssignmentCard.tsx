import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ProAssignment } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';
import { StatusPill } from './StatusPill';

export function AssignmentCard({
  assignment,
  onPress,
}: {
  assignment: ProAssignment;
  onPress: (a: ProAssignment) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const task = assignment.task;

  return (
    <Pressable
      onPress={() => onPress(assignment)}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {task ? task.itemCode : assignment.taskId}
        </Text>
        <StatusPill status={assignment.status} />
      </View>
      {task ? (
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
          {t('pro.card.province', { province: task.province })} · {task.requiredCredential}
        </Text>
      ) : null}
      {assignment.deliverableUrl ? (
        <Text style={[styles.delivered, { color: theme.colors.primary }]}>
          {t('pro.card.delivered')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 10, gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  meta: { fontSize: 13 },
  delivered: { fontSize: 12, fontWeight: '600' },
});
