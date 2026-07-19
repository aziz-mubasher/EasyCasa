import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { SearchFilters } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

const TYPES = ['apartment', 'house', 'villa', 'room', 'land', 'commercial'] as const;
const ENERGY = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

function euros(cents?: number): string {
  return cents === undefined ? '' : String(Math.round(cents / 100));
}

export function FilterSheet({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: SearchFilters;
  onClose: () => void;
  onApply: (f: SearchFilters) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [dealType, setDealType] = useState<SearchFilters['dealType']>(initial.dealType ?? 'sale');
  const [priceMin, setPriceMin] = useState(euros(initial.priceMinCents));
  const [priceMax, setPriceMax] = useState(euros(initial.priceMaxCents));
  const [minRooms, setMinRooms] = useState(initial.minRooms ? String(initial.minRooms) : '');
  const [types, setTypes] = useState<string[]>(initial.types ?? []);
  const [energy, setEnergy] = useState<string[]>(initial.energyClasses ?? []);

  const toggle = (list: string[], v: string, set: (x: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const apply = () => {
    const f: SearchFilters = { dealType };
    if (priceMin) f.priceMinCents = Number(priceMin) * 100;
    if (priceMax) f.priceMaxCents = Number(priceMax) * 100;
    if (minRooms) f.minRooms = Number(minRooms);
    if (types.length) f.types = types as SearchFilters['types'];
    if (energy.length) f.energyClasses = energy as SearchFilters['energyClasses'];
    onApply(f);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.h, { color: theme.colors.text }]}>{t('discovery.filters.title')}</Text>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('discovery.filters.dealType')}</Text>
          <View style={styles.row}>
            {(['sale', 'rent'] as const).map((d) => (
              <Chip key={d} active={dealType === d} label={t(`discovery.deal.${d}`)} onPress={() => setDealType(d)} theme={theme} />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('discovery.filters.price')}</Text>
          <View style={styles.row}>
            <Num value={priceMin} onChange={setPriceMin} placeholder={t('discovery.filters.min')} theme={theme} />
            <Num value={priceMax} onChange={setPriceMax} placeholder={t('discovery.filters.max')} theme={theme} />
          </View>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('discovery.filters.minRooms')}</Text>
          <Num value={minRooms} onChange={setMinRooms} placeholder="1+" theme={theme} />

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('discovery.filters.type')}</Text>
          <View style={styles.wrap}>
            {TYPES.map((tp) => (
              <Chip key={tp} active={types.includes(tp)} label={t(`discovery.type.${tp}`)} onPress={() => toggle(types, tp, setTypes)} theme={theme} />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('discovery.filters.energy')}</Text>
          <View style={styles.wrap}>
            {ENERGY.map((e) => (
              <Chip key={e} active={energy.includes(e)} label={e} onPress={() => toggle(energy, e, setEnergy)} theme={theme} />
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={{ color: theme.colors.textMuted }}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable onPress={apply} style={[styles.apply, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}>
            <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('discovery.filters.apply')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ active, label, onPress, theme }: { active: boolean; label: string; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderRadius: theme.radius.sm }]}
    >
      <Text style={{ color: active ? theme.colors.primaryText : theme.colors.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function Num({ value, onChange, placeholder, theme }: { value: string; onChange: (s: string) => void; placeholder: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      keyboardType="numeric"
      style={[styles.num, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md }]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 6 },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 14 },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8 },
  num: { flex: 1, height: 44, paddingHorizontal: 12, fontSize: 15 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, alignItems: 'center' },
  cancel: { paddingHorizontal: 16, paddingVertical: 12 },
  apply: { flex: 1, paddingVertical: 14, alignItems: 'center' },
});
