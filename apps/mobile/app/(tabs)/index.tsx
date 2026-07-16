import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { Listing } from '@easycasa/api-client';
import { useListings } from '../../src/api/hooks';
import { ListingCard } from '../../src/components/ListingCard';
import { useTheme } from '../../src/theme/useTheme';

export default function SearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  const [q, setQ] = useState('');
  const { data, isLoading, isError, refetch, isRefetching } = useListings({ q, pageSize: 20 });

  const open = (listing: Listing) => router.push(`/listing/${listing.slug}`);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t('search.placeholder')}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: theme.radius.md,
          },
        ]}
        returnKeyType="search"
      />

      {isLoading ? (
        <ActivityIndicator style={styles.center} color={theme.colors.primary} />
      ) : isError ? (
        <Text style={[styles.center, { color: theme.colors.danger }]}>{t('common.error')}</Text>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingCard listing={item} onPress={open} />}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={
            data ? (
              <Text style={[styles.count, { color: theme.colors.textMuted }]}>
                {t('search.resultsCount', { count: data.total })}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={[styles.center, { color: theme.colors.textMuted }]}>
              {t('search.empty')}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  input: { height: 48, paddingHorizontal: 16, fontSize: 16, marginBottom: 12 },
  list: { paddingBottom: 24 },
  count: { fontSize: 13, marginBottom: 8 },
  center: { textAlign: 'center', marginTop: 48 },
});
