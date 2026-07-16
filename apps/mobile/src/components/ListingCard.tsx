import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Listing } from '@easycasa/api-client';
import { useTheme } from '../theme/useTheme';

interface Props {
  listing: Listing;
  onPress?: (listing: Listing) => void;
}

function formatPrice(price: number | null, locale: string): string | null {
  if (price === null) return null;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

export function ListingCard({ listing, onPress }: Props) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const price = formatPrice(listing.priceEur, i18n.language);

  return (
    <Pressable
      onPress={() => onPress?.(listing)}
      accessibilityRole="button"
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
      ]}
    >
      {listing.coverUrl || listing.cover ? (
        <Image
          source={{ uri: listing.coverUrl ?? listing.cover!.url }}
          style={[styles.image, { borderRadius: theme.radius.sm }]}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.colors.border }]} />
      )}
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>
          {listing.title}
        </Text>
        <Text style={[styles.price, { color: theme.colors.primary }]}>
          {price ?? t('listing.priceOnRequest')}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.colors.textMuted }]}>
          {[
            listing.bedrooms !== null
              ? t('listing.bedrooms', { count: listing.bedrooms })
              : null,
            listing.bathrooms !== null
              ? t('listing.bathrooms', { count: listing.bathrooms })
              : null,
            listing.areaSqm !== null
              ? t('listing.area', { value: listing.areaSqm })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', marginBottom: 12 },
  image: { width: '100%', height: 180 },
  body: { padding: 12, gap: 4 },
  title: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13 },
});
