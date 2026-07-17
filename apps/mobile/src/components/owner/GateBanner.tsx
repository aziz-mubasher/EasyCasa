import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { FascicoloEvaluation, GateResult } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

function GateRow({ result }: { result: GateResult }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const it = i18n.language.startsWith('it');
  const label = t(`owner.gate.${result.gate}`);
  const color = result.allowed ? theme.colors.primary : theme.colors.danger;

  return (
    <View style={[styles.row, { borderColor: theme.colors.border }]}>
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.gateLabel, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.status, { color }]}>
          {result.allowed ? t('owner.gate.ready') : t('owner.gate.blocked')}
        </Text>
      </View>
      {result.blockers.map((b) => (
        <Text key={`${b.document}-${b.code}`} style={[styles.blocker, { color: theme.colors.danger }]}>
          • {it ? b.messageIt : b.messageEn}
        </Text>
      ))}
      {result.warnings.map((w) => (
        <Text key={`${w.document}-${w.code}`} style={[styles.warning, { color: theme.colors.textMuted }]}>
          • {it ? w.messageIt : w.messageEn}
        </Text>
      ))}
    </View>
  );
}

export function GateBanner({ gates }: { gates: FascicoloEvaluation }) {
  return (
    <View style={styles.container}>
      <GateRow result={gates.publish} />
      <GateRow result={gates.close} />
      <GateRow result={gates.registerLease} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 16 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  gateLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  status: { fontSize: 13, fontWeight: '700' },
  blocker: { fontSize: 13, marginLeft: 18 },
  warning: { fontSize: 12, marginLeft: 18, fontStyle: 'italic' },
});
