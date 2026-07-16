import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useListing, useFavorites, useToggleFavorite } from '../../src/api/hooks';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';

export default function ListingDetailScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading, isError } = useListing(slug ?? '');
  const { isAuthenticated } = useAuth();
  const { data: favorites } = useFavorites();
  const toggle = useToggleFavorite();

  if (isLoading) {
    return <ActivityIndicator style={styles.center} color={theme.colors.primary} />;
  }
  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.danger }}>{t('common.error')}</Text>
      </View>
    );
  }

  const isSaved = (favorites ?? []).some((f) => f.id === data.id);
  const price =
    data.priceEur !== null
      ? new Intl.NumberFormat(i18n.language, {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(data.priceEur)
      : t('listing.priceOnRequest');

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {data.media.map((m) => (
          <Image key={m.id} source={{ uri: m.url }} style={styles.hero} />
        ))}
      </ScrollView>

      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{data.title}</Text>
        <Text style={[styles.price, { color: theme.colors.primary }]}>{price}</Text>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
          {[
            data.bedrooms !== null ? t('listing.bedrooms', { count: data.bedrooms }) : null,
            data.bathrooms !== null ? t('listing.bathrooms', { count: data.bathrooms }) : null,
            data.areaSqm !== null ? t('listing.area', { value: data.areaSqm }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {isAuthenticated && (
          <Pressable
            onPress={() => toggle.mutate({ listingId: data.id, next: !isSaved })}
            style={[
              styles.save,
              {
                backgroundColor: isSaved ? theme.colors.surface : theme.colors.primary,
                borderColor: theme.colors.border,
                borderWidth: isSaved ? 1 : 0,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Text
              style={{
                color: isSaved ? theme.colors.text : theme.colors.primaryText,
                fontWeight: '700',
              }}
            >
              {isSaved ? t('listing.unsave') : t('listing.saveToggle')}
            </Text>
          </Pressable>
        )}

        <Text style={[styles.description, { color: theme.colors.text }]}>{data.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64 },
  hero: { width: 360, height: 260 },
  body: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  price: { fontSize: 20, fontWeight: '700' },
  meta: { fontSize: 14 },
  save: { paddingVertical: 14, alignItems: 'center', marginVertical: 8 },
  description: { fontSize: 15, lineHeight: 22 },
});
