import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ProCredential } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

export function CredentialRow({ credential }: { credential: ProCredential }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const color =
    credential.status === 'VERIFIED'
      ? theme.colors.primary
      : credential.status === 'REJECTED'
        ? theme.colors.danger
        : theme.colors.textMuted;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.body}>
        <Text style={[styles.type, { color: theme.colors.text }]}>{credential.type}</Text>
        {credential.reference ? (
          <Text style={[styles.ref, { color: theme.colors.textMuted }]}>{credential.reference}</Text>
        ) : null}
        {credential.expiresAt ? (
          <Text style={[styles.ref, { color: theme.colors.textMuted }]}>
            {t('pro.cred.expires', { date: credential.expiresAt.slice(0, 10) })}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.status, { color }]}>{t(`pro.cred.${credential.status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  body: { gap: 2, flex: 1 },
  type: { fontSize: 15, fontWeight: '600' },
  ref: { fontSize: 12 },
  status: { fontSize: 12, fontWeight: '700' },
});
