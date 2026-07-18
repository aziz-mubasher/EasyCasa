import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Mandate } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

export function MandateStatusCard({ mandate }: { mandate: Mandate }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const blocked = mandate.reviewRequiredItems.length > 0 || mandate.types.length === 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('owner.checkout.mandate')}</Text>
        <Text style={[styles.status, { color: theme.colors.primary }]}>{mandate.status}</Text>
      </View>
      <Text style={[styles.types, { color: theme.colors.textMuted }]}>
        {mandate.types.length > 0 ? mandate.types.join(' · ') : t('owner.checkout.noTypes')}
      </Text>
      {blocked ? (
        <View style={[styles.warn, { borderColor: theme.colors.danger }]}>
          <Text style={[styles.warnText, { color: theme.colors.danger }]}>
            {mandate.reviewRequiredItems.length > 0
              ? t('owner.checkout.awaitingReview', { count: mandate.reviewRequiredItems.length })
              : t('owner.services.awaitingLegalReview')}
          </Text>
          {mandate.reviewRequiredItems.map((code) => (
            <Text key={code} style={[styles.item, { color: theme.colors.textMuted }]}>
              • {code}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 8, marginTop: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700' },
  status: { fontSize: 13, fontWeight: '700' },
  types: { fontSize: 13 },
  warn: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 2, marginTop: 4 },
  warnText: { fontSize: 13, fontWeight: '600' },
  item: { fontSize: 12 },
});
