import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { AlertSavedSearchCriteria, MapGeoPoint, SearchFilters } from '@easycasa/api-client';
import { DiscoveryMap } from '../../src/components/discovery/DiscoveryMap';
import { FilterSheet } from '../../src/components/discovery/FilterSheet';
import { ListingCard } from '../../src/components/discovery/ListingCard';
import { SaveSearchModal } from '../../src/components/discovery/SaveSearchModal';
import {
  useAreaSearch,
  useBoundsSearch,
  useCreateSavedSearch,
  type Bounds,
} from '../../src/api/discovery-hooks';
import { useTheme } from '../../src/theme/useTheme';

/** Milan default viewport. */
const INITIAL = {
  latitude: 45.4642,
  longitude: 9.19,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [zoom, setZoom] = useState(12);
  const [filters, setFilters] = useState<SearchFilters>({ dealType: 'sale' });
  const [drawMode, setDrawMode] = useState(false);
  const [polygon, setPolygon] = useState<MapGeoPoint[] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRegionChange = (b: Bounds, z: number) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setBounds(b);
      setZoom(z);
    }, 350);
  };

  const boundsReq = !polygon && bounds ? { bounds, zoom, filters } : null;
  const areaReq = polygon ? { polygon, zoom, filters } : null;
  const boundsSearch = useBoundsSearch(boundsReq);
  const areaSearch = useAreaSearch(areaReq);
  const result = polygon ? areaSearch.data : boundsSearch.data;

  const createSaved = useCreateSavedSearch();

  const criteria = useMemo<AlertSavedSearchCriteria>(
    () => ({ filters, ...(polygon ? { polygon } : bounds ? { bbox: bounds } : {}) }),
    [filters, polygon, bounds],
  );

  const onSave = (name: string, frequency: 'instant' | 'daily' | 'off') => {
    createSaved.mutate(
      { name, criteria, frequency },
      { onSuccess: () => setSaveOpen(false) },
    );
  };

  return (
    <View style={styles.fill}>
      <DiscoveryMap
        initialRegion={INITIAL}
        clusters={result?.clusters ?? []}
        drawMode={drawMode}
        onRegionChange={onRegionChange}
        onSelectListing={(id) => router.push(`/listing/${id}`)}
        onPolygonComplete={(p) => {
          setPolygon(p);
          setDrawMode(false);
        }}
      />

      <View style={styles.topBar}>
        <Pill label={t('discovery.filters.title')} onPress={() => setFilterOpen(true)} theme={theme} />
        <Pill
          label={drawMode ? t('common.cancel') : t('discovery.draw')}
          active={drawMode}
          onPress={() => {
            setDrawMode((d) => !d);
            setPolygon(null);
          }}
          theme={theme}
        />
        {polygon ? (
          <Pill label={t('discovery.clearArea')} onPress={() => setPolygon(null)} theme={theme} />
        ) : null}
        <Pill label={t('discovery.save.cta')} onPress={() => setSaveOpen(true)} theme={theme} />
        <Pill
          label={t('discovery.savedLabel')}
          onPress={() => router.push('/(search)/saved')}
          theme={theme}
        />
      </View>

      <View style={[styles.panel, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.count, { color: theme.colors.text }]}>
          {t('discovery.results', { count: result?.total ?? 0 })}
        </Text>
        <View style={styles.list}>
          {(result?.pins ?? []).slice(0, 4).map((pin) => (
            <ListingCard
              key={pin.listingId}
              pin={pin}
              onPress={(id) => router.push(`/listing/${id}`)}
            />
          ))}
        </View>
      </View>

      <FilterSheet
        visible={filterOpen}
        initial={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setFilterOpen(false);
        }}
      />
      <SaveSearchModal
        visible={saveOpen}
        saving={createSaved.isPending}
        onClose={() => setSaveOpen(false)}
        onSave={onSave}
      />
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, { backgroundColor: active ? theme.colors.primary : theme.colors.surface }]}
    >
      <Text
        style={{
          color: active ? theme.colors.primaryText : theme.colors.text,
          fontSize: 12,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, elevation: 3 },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '42%',
  },
  count: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  list: { gap: 0 },
});
