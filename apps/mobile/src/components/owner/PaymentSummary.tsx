import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatEuroCents, type Fattura } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

export function PaymentSummary({ fattura }: { fattura: Fattura }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
      <Text style={[styles.title, { color: theme.colors.textMuted }]}>{t('payment.summary')}</Text>

      <Row label={t('payment.imponibile')} value={formatEuroCents(fattura.imponibileTotalCents)} theme={theme} />
      <Row label={t('payment.iva')} value={formatEuroCents(fattura.impostaTotalCents)} theme={theme} />
      {fattura.needsBollo ? (
        <Row label={t('payment.bollo')} value={formatEuroCents(fattura.bolloCents)} theme={theme} />
      ) : null}

      <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.totalLabel, { color: theme.colors.text }]}>{t('payment.total')}</Text>
        <Text style={[styles.totalValue, { color: theme.colors.text }]}>
          {formatEuroCents(fattura.totaleDocumentoCents)}
        </Text>
      </View>

      <Text style={[styles.note, { color: theme.colors.textMuted }]}>
        {t('payment.fatturaNote', { date: fattura.emissionDeadline })}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 8, marginTop: 12 },
  title: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '800' },
  totalValue: { fontSize: 15, fontWeight: '800' },
  note: { fontSize: 11, fontStyle: 'italic', marginTop: 4 },
});
