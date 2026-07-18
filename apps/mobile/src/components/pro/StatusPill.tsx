import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AssignmentStatus } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

const COLORS: Record<AssignmentStatus, keyof ReturnType<typeof useTheme>['colors']> = {
  REQUESTED: 'textMuted',
  ASSIGNED: 'primary',
  IN_PROGRESS: 'primary',
  DELIVERED: 'primary',
  APPROVED: 'primary',
};

export function StatusPill({ status }: { status: AssignmentStatus }) {
  const theme = useTheme();
  const color = theme.colors[COLORS[status]];
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});
