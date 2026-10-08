import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useFavorites } from '../../src/api/hooks';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';

function euro(priceEur: number | null): string {
  if (priceEur == null) return '—';
  return `€ ${Math.round(priceEur).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export default function FavoritesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, signIn } = useAuth();
  const { data, isLoading } = useFavorites();
  const [seg, setSeg] = useState<'listings' | 'searches'>('listings');

  if (!isAuthenticated) {
    return (
      <View
        style={[
          styles.gate,
          { backgroundColor: theme.colors.background, paddingTop: insets.top + 24, paddingHorizontal: 20 },
        ]}
      >
        <Text style={{ fontFamily: theme.font.display, fontSize: 28, color: theme.colors.text }}>
          Salvati
        </Text>
        <Text
          style={{
            fontFamily: theme.font.body,
            fontSize: 16,
            lineHeight: 22,
            color: theme.colors.textMuted,
            marginTop: 12,
          }}
        >
          {t('auth.signedOutBody')}
        </Text>
        <Pressable
          onPress={() => void signIn()}
          style={[
            styles.cta,
            { backgroundColor: theme.colors.ink, borderRadius: theme.radius.md, marginTop: 20 },
          ]}
        >
          <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.inkText }}>
            Accedi o crea un account
          </Text>
        </Pressable>
      </View>
    );
  }

  const items = data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top + 20 }]}>
      <Text
        style={{
          fontFamily: theme.font.display,
          fontSize: 28,
          color: theme.colors.text,
          paddingHorizontal: 20,
          marginBottom: 14,
        }}
      >
        Salvati
      </Text>

      <View style={[styles.seg, { backgroundColor: theme.colors.sand, marginHorizontal: 20 }]}>
        <Pressable
          onPress={() => setSeg('listings')}
          style={[styles.segItem, seg === 'listings' && { backgroundColor: theme.colors.cream }]}
        >
          <Text
            style={{
              fontFamily: theme.font.displaySemi,
              fontSize: 14,
              color: seg === 'listings' ? theme.colors.text : theme.colors.textMuted,
            }}
          >
            Immobili <Text style={{ fontFamily: theme.font.mono }}>{items.length}</Text>
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSeg('searches');
            router.push('/(search)/saved');
          }}
          style={[styles.segItem, seg === 'searches' && { backgroundColor: theme.colors.cream }]}
        >
          <Text
            style={{
              fontFamily: theme.font.displaySemi,
              fontSize: 14,
              color: theme.colors.textMuted,
            }}
          >
            Ricerche
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: 'center',
                marginTop: 48,
                color: theme.colors.textMuted,
                fontFamily: theme.font.body,
                fontSize: 16,
              }}
            >
              {t('favorites.empty')}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/listing/${item.slug}`)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.cream,
                  borderColor: 'rgba(20,33,46,0.10)',
                  borderRadius: theme.radius.lg,
                },
              ]}
            >
              {item.coverUrl || item.cover ? (
                <Image
                  source={{ uri: item.coverUrl ?? item.cover!.url }}
                  style={styles.thumb}
                />
              ) : (
                <View style={[styles.thumb, { backgroundColor: theme.colors.sand }]} />
              )}
              <View style={{ flex: 1, gap: 4, minWidth: 0, paddingTop: 2 }}>
                <Text style={{ fontFamily: theme.font.mono, fontSize: 18, color: theme.colors.text }}>
                  {euro(item.priceEur)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: theme.font.displaySemi, fontSize: 15, color: theme.colors.text }}
                >
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textMuted }}
                >
                  {item.city ?? '—'}
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: theme.colors.text, marginTop: 4 }}>♥</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gate: { flex: 1 },
  cta: { height: 52, alignItems: 'center', justifyContent: 'center' },
  seg: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    gap: 3,
  },
  segItem: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#14212e',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  thumb: { width: 104, height: 104, borderRadius: 12 },
});
