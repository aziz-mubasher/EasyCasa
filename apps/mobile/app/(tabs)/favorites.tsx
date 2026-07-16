import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useFavorites } from '../../src/api/hooks';
import { useAuth } from '../../src/auth/AuthProvider';
import { ListingCard } from '../../src/components/ListingCard';
import { useTheme } from '../../src/theme/useTheme';

export default function FavoritesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useFavorites();

  if (!isAuthenticated) {
    return (
      <View style={[styles.gate, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.gateTitle, { color: theme.colors.text }]}>
          {t('auth.signedOutTitle')}
        </Text>
        <Text style={[styles.gateBody, { color: theme.colors.textMuted }]}>
          {t('auth.signedOutBody')}
        </Text>
        <Pressable
          onPress={() => router.push('/(auth)/sign-in')}
          style={[styles.cta, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
        >
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>
            {t('auth.signIn')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      {isLoading ? (
        <ActivityIndicator style={styles.center} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={(l) => router.push(`/listing/${l.slug}`)} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.center, { color: theme.colors.textMuted }]}>
              {t('favorites.empty')}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  list: { paddingBottom: 24 },
  center: { textAlign: 'center', marginTop: 48 },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  gateTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  gateBody: { fontSize: 15, textAlign: 'center' },
  cta: { paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
});
