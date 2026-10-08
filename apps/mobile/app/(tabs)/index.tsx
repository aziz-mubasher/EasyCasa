import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { SearchFilters } from '@easycasa/api-client';
import { useBoundsSearch } from '../../src/api/discovery-hooks';
import { ListingCard } from '../../src/components/discovery/ListingCard';
import { FilterSheet } from '../../src/components/discovery/FilterSheet';
import { useTheme } from '../../src/theme/useTheme';

/** Brescia metro viewport — design v2 default search. */
const BRESCIA_BOUNDS = {
  minLat: 45.49,
  minLng: 10.15,
  maxLat: 45.58,
  maxLng: 10.28,
};

export default function SearchListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  const [query, setQuery] = useState('Brescia');
  const [filters, setFilters] = useState<SearchFilters>({ dealType: 'sale' });
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.priceMaxCents != null) n += 1;
    if (filters.minRooms != null) n += 1;
    if (filters.energyClasses?.length) n += 1;
    if (filters.types?.length) n += 1;
    if (filters.priceMinCents != null) n += 1;
    return n;
  }, [filters]);

  const search = useBoundsSearch({
    bounds: BRESCIA_BOUNDS,
    zoom: 12,
    filters,
  });

  const pins = search.data?.pins ?? [];
  const total = search.data?.total ?? pins.length;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: 'rgba(20,33,46,0.10)' }]}>
        <View style={styles.searchRow}>
          <View
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.cream,
                borderColor: 'rgba(20,33,46,0.30)',
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.colors.textMuted}
              style={{
                flex: 1,
                fontFamily: theme.font.displayMed,
                fontSize: 17,
                color: theme.colors.text,
                paddingVertical: 0,
              }}
              returnKeyType="search"
              accessibilityLabel="Comune o zona"
            />
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            accessibilityLabel={
              activeFilterCount > 0 ? `Filtri, ${activeFilterCount} attivi` : 'Filtri'
            }
            style={[
              styles.filterBtn,
              { backgroundColor: theme.colors.ink, borderRadius: theme.radius.md },
            ]}
          >
            <Text style={{ color: theme.colors.inkText, fontSize: 18 }}>☰</Text>
            {activeFilterCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.orange, borderColor: theme.colors.background }]}>
                <Text style={{ fontFamily: theme.font.mono, fontSize: 11, color: theme.colors.ink }}>
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip
            label="Vendita"
            on={filters.dealType === 'sale'}
            onPress={() => setFilters((f) => ({ ...f, dealType: 'sale' }))}
            theme={theme}
          />
          <Chip
            label="Affitto"
            on={filters.dealType === 'rent'}
            onPress={() => setFilters((f) => ({ ...f, dealType: 'rent' }))}
            theme={theme}
          />
          {filters.priceMaxCents != null ? (
            <Chip
              label={`fino a € ${Math.round(filters.priceMaxCents / 100).toLocaleString('it-IT')}`}
              on
              onPress={() => setFilters((f) => ({ ...f, priceMaxCents: undefined }))}
              theme={theme}
              dismiss
            />
          ) : null}
          {filters.minRooms != null ? (
            <Chip
              label={`${filters.minRooms}+ locali`}
              on
              onPress={() => setFilters((f) => ({ ...f, minRooms: undefined }))}
              theme={theme}
              dismiss
            />
          ) : null}
          <Chip label="Solo privati" on={false} onPress={() => setFilterOpen(true)} theme={theme} />
        </ScrollView>
      </View>

      <View style={styles.metaRow}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.text }}>
            {t('search.resultsCount', { count: total })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.font.display, fontSize: 14 }}>
              ↕ Più recenti
            </Text>
            <Pressable onPress={() => router.push('/(search)/saved')}>
              <Text style={{ color: theme.colors.primary, fontFamily: theme.font.displaySemi, fontSize: 14 }}>
                🔔 Salva ricerca
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.seg, { backgroundColor: theme.colors.sand }]}>
          <View style={[styles.segOn, { backgroundColor: theme.colors.cream }]}>
            <Text style={{ color: theme.colors.text, fontSize: 16 }}>☰</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(search)')}
            style={styles.segOff}
            accessibilityLabel="Mappa"
          >
            <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>▦</Text>
          </Pressable>
        </View>
      </View>

      {search.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={pins}
          keyExtractor={(p) => p.listingId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ListingCard pin={item} onPress={(id) => router.push(`/listing/${id}`)} />
          )}
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
              {t('search.empty')}
            </Text>
          }
        />
      )}

      <FilterSheet
        visible={filterOpen}
        initial={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
      />
    </View>
  );
}

function Chip({
  label,
  on,
  onPress,
  theme,
  dismiss,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  dismiss?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: on ? theme.colors.ink : 'transparent',
          borderColor: on ? theme.colors.ink : 'rgba(20,33,46,0.30)',
        },
      ]}
    >
      <Text
        style={{
          fontFamily: theme.font.displayMed,
          fontSize: 14,
          color: on ? theme.colors.inkText : theme.colors.text,
        }}
      >
        {label}
        {dismiss ? ' ×' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    paddingHorizontal: 4,
  },
  chips: { gap: 8, paddingRight: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  seg: {
    width: 100,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    gap: 3,
  },
  segOn: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOff: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
});
