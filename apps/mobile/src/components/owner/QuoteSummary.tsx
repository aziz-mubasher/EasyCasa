import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { summarizeQuote, type Quote } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

export function QuoteSummary({ quote }: { quote: Quote }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const display = summarizeQuote(quote, i18n.language);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
      {display.lines.map((line) => (
        <View key={line.code} style={styles.line}>
          <View style={styles.lineLabel}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{line.label}</Text>
            {line.estimated ? (
              <Text style={[styles.est, { color: theme.colors.textMuted }]}>
                {t('owner.quote.estimated')}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.amount, { color: theme.colors.text }]}>{line.amount}</Text>
        </View>
      ))}

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <View style={styles.line}>
        <Text style={[styles.totalLabel, { color: theme.colors.text }]}>{t('owner.quote.dueNow')}</Text>
        <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>{display.dueNow}</Text>
      </View>

      {display.hasEstimated ? (
        <>
          <View style={styles.line}>
            <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>
              {t('owner.quote.estimatedTotal')}
            </Text>
            <Text style={[styles.subAmount, { color: theme.colors.textMuted }]}>
              {display.estimatedTotal}
            </Text>
          </View>
          <Text style={[styles.note, { color: theme.colors.textMuted }]}>
            {t('owner.quote.provvigioneNote')}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineLabel: { flex: 1, gap: 2 },
  label: { fontSize: 14 },
  est: { fontSize: 11, fontStyle: 'italic' },
  amount: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalAmount: { fontSize: 18, fontWeight: '800' },
  subLabel: { fontSize: 13 },
  subAmount: { fontSize: 13 },
  note: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
});
