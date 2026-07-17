import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ChecklistEntry } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

interface Props {
  entry: ChecklistEntry;
  uploading: boolean;
  onUpload: (code: string) => void;
}

export function DocumentChecklistRow({ entry, uploading, onUpload }: Props) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const label = i18n.language.startsWith('it') ? entry.labelIt : entry.labelEn;

  const state = entry.verified ? 'verified' : entry.present ? 'pending' : 'missing';
  const stateColor =
    state === 'verified'
      ? theme.colors.primary
      : state === 'pending'
        ? theme.colors.textMuted
        : theme.colors.danger;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={[styles.check, { borderColor: stateColor }]}>
        {entry.verified ? <View style={[styles.fill, { backgroundColor: stateColor }]} /> : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.state, { color: stateColor }]}>
          {t(`owner.doc.${state}`)}
        </Text>
      </View>
      <Pressable
        onPress={() => onUpload(entry.code)}
        disabled={uploading}
        style={[styles.btn, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm }]}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {entry.present ? t('owner.doc.replace') : t('owner.doc.upload')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fill: { width: 12, height: 12, borderRadius: 3 },
  body: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '500' },
  state: { fontSize: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, minWidth: 84, alignItems: 'center' },
});
