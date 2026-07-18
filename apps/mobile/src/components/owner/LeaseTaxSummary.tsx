import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatEuroCents, type RliPayload } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

export function LeaseTaxSummary({ payload }: { payload: RliPayload }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { taxes } = payload;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.danger,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text style={[styles.deadlineLabel, { color: theme.colors.danger }]}>
        {t('owner.lease.deadline')}
      </Text>
      <Text style={[styles.deadlineValue, { color: theme.colors.text }]}>
        {payload.registrationDeadline}
      </Text>

      <Row
        label={t('owner.lease.cedolare')}
        value={
          payload.cedolareSecca
            ? `${Math.round(payload.cedolareRate * 100)}%`
            : t('owner.lease.cedolareNone')
        }
        theme={theme}
      />

      {taxes.cedolare ? (
        <Text style={[styles.note, { color: theme.colors.textMuted }]}>
          {t('owner.lease.cedolareNote')}
        </Text>
      ) : (
        <>
          <Row
            label={t('owner.lease.taxesRegistro')}
            value={formatEuroCents(taxes.registroCents)}
            theme={theme}
          />
          <Row
            label={t('owner.lease.taxesBollo')}
            value={formatEuroCents(taxes.bolloCents)}
            theme={theme}
          />
          <Row
            label={t('owner.lease.taxesTotal')}
            value={formatEuroCents(taxes.totalCents)}
            theme={theme}
            strong
          />
        </>
      )}

      {taxes.note ? (
        <Text style={[styles.note, { color: theme.colors.textMuted }]}>{taxes.note}</Text>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  theme,
  strong,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text, fontWeight: strong ? '800' : '600' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 8, marginTop: 8, borderWidth: 2 },
  deadlineLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  deadlineValue: { fontSize: 22, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13 },
  value: { fontSize: 13 },
  note: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
});
