import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { EstimateResult, SubjectProperty } from '@easycasa/api-client';
import { useValuationEstimate } from '../../src/api/valuation';
import { useTheme } from '../../src/theme/useTheme';

const TYPES = ['apartment', 'house', 'villa'] as const;
const ENERGY = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const CONDITIONS = ['new', 'renovated', 'good', 'to_renovate'] as const;

function euro(cents: number): string {
  // Round to nearest thousand for display.
  const k = Math.round(cents / 100 / 1000) * 1000;
  return `€ ${k.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

const CONF_COLOR: Record<string, string> = { high: '#22a559', medium: '#f59e0b', low: '#6b7280' };

export default function ValuationScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const estimate = useValuationEstimate();

  const [comune, setComune] = useState('Milano');
  const [provincia, setProvincia] = useState('MI');
  const [type, setType] = useState<(typeof TYPES)[number]>('apartment');
  const [areaM2, setAreaM2] = useState('90');
  const [rooms, setRooms] = useState('3');
  const [energyClass, setEnergyClass] = useState<(typeof ENERGY)[number] | null>('C');
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number] | null>('good');
  const [result, setResult] = useState<EstimateResult | null>(null);

  const run = () => {
    const area = Number(areaM2);
    if (!area || area <= 0) {
      Alert.alert(t('valuation.error'), t('valuation.needArea'));
      return;
    }
    const subject: SubjectProperty = {
      comune: comune.trim(),
      provincia: provincia.trim().toUpperCase(),
      lat: 45.4642, // TODO: geocode the address; Milan placeholder
      lng: 9.19,
      type,
      areaM2: area,
      rooms: Number(rooms) || 0,
      energyClass,
      condition,
    };
    estimate.mutate(
      { subject },
      {
        onSuccess: (r) => setResult(r),
        onError: (e) => Alert.alert(t('valuation.error'), e.message),
      },
    );
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.h, { color: theme.colors.text }]}>{t('valuation.title')}</Text>
      <Text style={[styles.sub, { color: theme.colors.textMuted }]}>{t('valuation.subtitle')}</Text>

      <Field label={t('valuation.comune')} value={comune} onChange={setComune} theme={theme} />
      <Field label={t('valuation.provincia')} value={provincia} onChange={setProvincia} theme={theme} />

      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('valuation.type')}</Text>
      <View style={styles.wrap}>
        {TYPES.map((tp) => (
          <Chip key={tp} active={type === tp} label={t(`valuation.types.${tp}`)} onPress={() => setType(tp)} theme={theme} />
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Field label={t('valuation.area')} value={areaM2} onChange={setAreaM2} numeric theme={theme} />
        </View>
        <View style={styles.half}>
          <Field label={t('valuation.rooms')} value={rooms} onChange={setRooms} numeric theme={theme} />
        </View>
      </View>

      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('valuation.energy')}</Text>
      <View style={styles.wrap}>
        {ENERGY.map((e) => (
          <Chip key={e} active={energyClass === e} label={e} onPress={() => setEnergyClass(e)} theme={theme} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('valuation.condition')}</Text>
      <View style={styles.wrap}>
        {CONDITIONS.map((c) => (
          <Chip key={c} active={condition === c} label={t(`valuation.conditions.${c}`)} onPress={() => setCondition(c)} theme={theme} />
        ))}
      </View>

      <Pressable onPress={run} disabled={estimate.isPending} style={[styles.cta, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}>
        {estimate.isPending ? (
          <ActivityIndicator color={theme.colors.primaryText} />
        ) : (
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('valuation.estimate')}</Text>
        )}
      </Pressable>

      {result ? (
        <View style={[styles.resultCard, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }]}>
          <Text style={[styles.range, { color: theme.colors.textMuted }]}>{euro(result.estimate.minCents)} – {euro(result.estimate.maxCents)}</Text>
          <Text style={[styles.point, { color: theme.colors.text }]}>{euro(result.estimate.pointCents)}</Text>
          <View style={styles.confRow}>
            <View style={[styles.confDot, { backgroundColor: CONF_COLOR[result.estimate.confidence] }]} />
            <Text style={[styles.conf, { color: theme.colors.textMuted }]}>
              {t(`valuation.confidence.${result.estimate.confidence}`)} · {t(`valuation.basis.${result.estimate.basis}`)}
            </Text>
          </View>
          <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>{t('valuation.disclaimer')}</Text>
          <Pressable style={[styles.paidCta, { borderColor: theme.colors.primary, borderRadius: theme.radius.md }]}>
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{t('valuation.getCertified')}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Field({ label, value, onChange, numeric, theme }: { label: string; value: string; onChange: (s: string) => void; numeric?: boolean; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md }]}
      />
    </View>
  );
}

function Chip({ active, label, onPress, theme }: { active: boolean; label: string; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderRadius: theme.radius.sm }]}>
      <Text style={{ color: active ? theme.colors.primaryText : theme.colors.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  h: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 4, marginBottom: 12 },
  field: { marginTop: 6 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  input: { height: 46, paddingHorizontal: 12, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8 },
  cta: { paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  resultCard: { padding: 20, marginTop: 20, alignItems: 'center', gap: 6 },
  range: { fontSize: 13, fontWeight: '600' },
  point: { fontSize: 30, fontWeight: '800' },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  confDot: { width: 8, height: 8, borderRadius: 4 },
  conf: { fontSize: 12, fontWeight: '600' },
  disclaimer: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
  paidCta: { borderWidth: 1.5, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', marginTop: 12, alignSelf: 'stretch' },
});
