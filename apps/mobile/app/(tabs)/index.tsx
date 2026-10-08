import React, { useMemo } from 'react';
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
import { useFlow } from '../../src/flow/FlowProvider';
import { activeFilterCount } from '../../src/flow/machine';
import { NAV } from '../../src/flow/paths';
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
  const flow = useFlow();
  const discovery = flow.state.discovery;

  const filters = useMemo<SearchFilters>(() => {
    const next: SearchFilters = { dealType: discovery.dealType };
    if (discovery.priceMaxEur != null) next.priceMaxCents = discovery.priceMaxEur * 100;
    if (discovery.minRooms != null) next.minRooms = discovery.minRooms;
    const energy: NonNullable<SearchFilters['energyClasses']> = [];
    for (const letter of discovery.energy) {
      if (letter === 'A') energy.push('A1');
      else if (letter === 'B' || letter === 'C' || letter === 'D' || letter === 'E' || letter === 'F' || letter === 'G') {
        energy.push(letter);
      }
    }
    if (energy.length) next.energyClasses = energy;
    return next;
  }, [discovery]);

  const filterCount = activeFilterCount(discovery);

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
              value={discovery.text}
              onChangeText={(text) => flow.setDiscovery({ text })}
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
            onPress={() => router.push(NAV.filters)}
            accessibilityLabel={
              filterCount > 0 ? `Filtri, ${filterCount} attivi` : 'Filtri'
            }
            style={[
              styles.filterBtn,
              { backgroundColor: theme.colors.ink, borderRadius: theme.radius.md },
            ]}
          >
            <Text style={{ color: theme.colors.inkText, fontSize: 18 }}>☰</Text>
            {filterCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.orange, borderColor: theme.colors.background }]}>
                <Text style={{ fontFamily: theme.font.mono, fontSize: 11, color: theme.colors.ink }}>
                  {filterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip
            label="Vendita"
            on={discovery.dealType === 'sale'}
            onPress={() => flow.setDiscovery({ dealType: 'sale' })}
            theme={theme}
          />
          <Chip
            label="Affitto"
            on={discovery.dealType === 'rent'}
            onPress={() => flow.setDiscovery({ dealType: 'rent' })}
            theme={theme}
          />
          {discovery.priceMaxEur != null ? (
            <Chip
              label={`fino a € ${discovery.priceMaxEur.toLocaleString('it-IT')}`}
              on
              onPress={() => flow.setDiscovery({ priceMaxEur: null })}
              theme={theme}
              dismiss
            />
          ) : null}
          {discovery.minRooms != null ? (
            <Chip
              label={`${discovery.minRooms}+ locali`}
              on
              onPress={() => flow.setDiscovery({ minRooms: null })}
              theme={theme}
              dismiss
            />
          ) : null}
          <Chip
            label="Solo privati"
            on={discovery.seller === 'private'}
            onPress={() => flow.setDiscovery({ seller: discovery.seller === 'private' ? 'all' : 'private' })}
            theme={theme}
          />
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
            <Pressable
              onPress={() => {
                if (!flow.isMember) {
                  flow.setReturnTo(NAV.saved);
                  router.push(NAV.signIn);
                  return;
                }
                flow.saveCurrentSearch();
                router.push(NAV.saved);
              }}
            >
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
            onPress={() => router.push(flow.state.locationAsked ? NAV.map : NAV.permLocation)}
            style={styles.segOff}
            accessibilityLabel="Mappa"
          >
            <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>▦</Text>
          </Pressable>
        </View>
      </View>

      {search.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : search.isError ? (
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ fontFamily: theme.font.display, fontSize: 22, color: theme.colors.text }}>Sei offline</Text>
          <Pressable onPress={() => void search.refetch()}>
            <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.primary }}>Riprova</Text>
          </Pressable>
          <Pressable onPress={() => router.push(NAV.offline)}>
            <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>Apri la schermata offline</Text>
          </Pressable>
        </View>
      ) : pins.length === 0 ? (
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ fontFamily: theme.font.display, fontSize: 24, color: theme.colors.text }}>
            Nessun annuncio con questi filtri
          </Text>
          <Text style={{ fontFamily: theme.font.body, fontSize: 16, lineHeight: 22, color: theme.colors.textMuted }}>
            Prova ad allargare il prezzo o la zona, oppure salva la ricerca: ti avvisiamo quando un proprietario pubblica qualcosa che corrisponde.
          </Text>
          <Pressable
            onPress={() => {
              if (!flow.isMember) {
                flow.setReturnTo(NAV.saved);
                router.push(NAV.signIn);
                return;
              }
              flow.saveCurrentSearch();
              router.push(NAV.saved);
            }}
          >
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.primary }}>
              Salva ricerca e avvisami
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push(NAV.filters)}>
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.text }}>Modifica i filtri</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              flow.setDiscovery({ priceMaxEur: null, minRooms: null, energy: [], seller: 'all', dealType: 'sale' })
            }
          >
            <Text style={{ fontFamily: theme.font.body, fontSize: 15, color: theme.colors.textMuted }}>Azzera filtri</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={pins}
          keyExtractor={(p) => p.listingId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ListingCard pin={item} onPress={(id) => router.push(`/listing/${id}`)} />
          )}
        />
      )}
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
