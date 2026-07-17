import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatEuroCents, type CatalogItem } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

interface Props {
  item: CatalogItem;
  selected: boolean;
  onToggle: (code: string) => void;
}

function priceLabel(
  item: CatalogItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (item.priceModel === 'provvigione') {
    return t('owner.svc.provvigione', { rate: ((item.ratePercent ?? 0) * 100).toFixed(2) });
  }
  const base = formatEuroCents(item.amountCents ?? 0);
  if (item.priceModel === 'passthrough') return t('owner.svc.passthrough', { amount: base });
  return item.ivaApplicable ? t('owner.svc.plusIva', { amount: base }) : base;
}

export function ServiceItemRow({ item, selected, onToggle }: Props) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const label = i18n.language.startsWith('it') ? item.labelIt : item.labelEn;
  const translate = (key: string, options?: Record<string, unknown>) =>
    String(t(key, options as never));

  return (
    <Pressable
      onPress={() => onToggle(item.code)}
      style={[
        styles.row,
        {
          backgroundColor: selected ? theme.colors.surface : 'transparent',
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <View style={[styles.box, { borderColor: selected ? theme.colors.primary : theme.colors.border }]}>
        {selected ? <View style={[styles.boxFill, { backgroundColor: theme.colors.primary }]} /> : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.price, { color: theme.colors.textMuted }]}>
          {priceLabel(item, translate)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, marginBottom: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  boxFill: { width: 12, height: 12, borderRadius: 3 },
  body: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '500' },
  price: { fontSize: 13 },
});
