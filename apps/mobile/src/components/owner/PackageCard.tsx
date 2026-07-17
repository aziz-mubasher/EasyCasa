import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatEuroCents, type ServicePackage } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

interface Props {
  pkg: ServicePackage;
  selected: boolean;
  onSelect: (code: string) => void;
}

export function PackageCard({ pkg, selected, onSelect }: Props) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const label = i18n.language.startsWith('it') ? pkg.labelIt : pkg.labelEn;

  return (
    <Pressable
      onPress={() => onSelect(pkg.code)}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{label}</Text>
        {pkg.bundleFixedCents != null ? (
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            {t('owner.svc.plusIva', { amount: formatEuroCents(pkg.bundleFixedCents) })}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.includes, { color: theme.colors.textMuted }]}>
        {t('owner.pkg.includes', { count: pkg.includes.length })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, marginBottom: 10, gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  price: { fontSize: 15, fontWeight: '700' },
  includes: { fontSize: 13 },
});
