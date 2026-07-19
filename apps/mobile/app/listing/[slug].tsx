import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { EnquiryIntent } from '@easycasa/api-client';
import { useCreateEnquiry } from '../../src/api/enquiries';
import { useDiscoveryListing, useSimilar } from '../../src/api/discovery-hooks';
import { useAuth } from '../../src/auth/AuthProvider';
import { EnquiryModal } from '../../src/components/discovery/EnquiryModal';
import { useTheme } from '../../src/theme/useTheme';

function euro(cents: number): string {
  const e = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€ ${e}`;
}

const ENERGY_COLORS: Record<string, string> = {
  A4: '#0a8f3c',
  A3: '#2aa22a',
  A2: '#5cb800',
  A1: '#8fce00',
  B: '#c8d400',
  C: '#f2d600',
  D: '#f5a700',
  E: '#f57a00',
  F: '#f24e00',
  G: '#e01a1a',
};

/**
 * Listing detail — Phase 21 shape (UUID from map clusters or legacy slug).
 * Route param kept as `slug` for deep-link compatibility.
 */
export default function ListingDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const listingId = slug ?? null;

  const { data: l, isLoading, isError } = useDiscoveryListing(listingId);
  const { data: similar } = useSimilar(listingId);
  const createEnquiry = useCreateEnquiry();
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !l) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.danger }}>{t('common.error')}</Text>
      </View>
    );
  }

  const perM2 = l.pricePerM2Cents ? euro(l.pricePerM2Cents) : null;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
        {l.photos.length > 0 ? (
          l.photos.map((p, i) => <Image key={i} source={{ uri: p.url }} style={styles.photo} />)
        ) : (
          <View style={[styles.photo, { backgroundColor: theme.colors.border }]} />
        )}
      </ScrollView>

      <View style={styles.pad}>
        <Text style={[styles.price, { color: theme.colors.text }]}>{euro(l.priceCents)}</Text>
        {perM2 ? (
          <Text style={[styles.perM2, { color: theme.colors.textMuted }]}>{perM2}/m²</Text>
        ) : null}
        <Text style={[styles.title, { color: theme.colors.text }]}>{l.title}</Text>
        <Text style={[styles.addr, { color: theme.colors.textMuted }]}>
          {l.location.address} · {l.location.comune} ({l.location.provincia})
        </Text>

        <View style={styles.facts}>
          <Fact label={t('discovery.detail.area')} value={`${l.keyFacts.areaM2} m²`} theme={theme} />
          <Fact label={t('discovery.detail.rooms')} value={String(l.keyFacts.rooms)} theme={theme} />
          {l.keyFacts.bathrooms != null ? (
            <Fact
              label={t('discovery.detail.baths')}
              value={String(l.keyFacts.bathrooms)}
              theme={theme}
            />
          ) : null}
          {l.keyFacts.floor != null ? (
            <Fact
              label={t('discovery.detail.floor')}
              value={String(l.keyFacts.floor)}
              theme={theme}
            />
          ) : null}
          {l.keyFacts.yearBuilt != null ? (
            <Fact
              label={t('discovery.detail.year')}
              value={String(l.keyFacts.yearBuilt)}
              theme={theme}
            />
          ) : null}
        </View>

        {l.energy.present && l.energy.energyClass ? (
          <View style={styles.energyRow}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              {t('discovery.detail.energy')}
            </Text>
            <View
              style={[
                styles.energyBadge,
                { backgroundColor: ENERGY_COLORS[l.energy.energyClass] ?? theme.colors.border },
              ]}
            >
              <Text style={styles.energyText}>{l.energy.energyClass}</Text>
            </View>
            {l.energy.performanceKwhM2Y != null ? (
              <Text style={[styles.perf, { color: theme.colors.textMuted }]}>
                {l.energy.performanceKwhM2Y} kWh/m²·a
              </Text>
            ) : null}
          </View>
        ) : null}

        {l.description ? (
          <Text style={[styles.desc, { color: theme.colors.text }]}>{l.description}</Text>
        ) : null}

        {l.features.length > 0 ? (
          <View style={styles.wrap}>
            {l.features.map((f) => (
              <View key={f} style={[styles.tag, { backgroundColor: theme.colors.surface }]}>
                <Text style={{ color: theme.colors.text, fontSize: 12 }}>{f}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {l.catastal ? (
          <Text style={[styles.catastal, { color: theme.colors.textMuted }]}>
            {l.catastal.display}
          </Text>
        ) : null}

        <MapView
          style={styles.miniMap}
          pointerEvents="none"
          initialRegion={{
            latitude: l.location.lat,
            longitude: l.location.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={{ latitude: l.location.lat, longitude: l.location.lng }} />
        </MapView>

        <Pressable
          onPress={() => {
            if (!isAuthenticated) {
              router.push('/(auth)/sign-in');
              return;
            }
            setEnquiryOpen(true);
          }}
          style={[
            styles.cta,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>
            {t('discovery.detail.contact')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!isAuthenticated) {
              router.push('/(auth)/sign-in');
              return;
            }
            if (!listingId) return;
            router.push(`/booking/${listingId}`);
          }}
          style={[
            styles.ctaSecondary,
            {
              borderColor: theme.colors.primary,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {t('viewings.bookCta')}
          </Text>
        </Pressable>

        <EnquiryModal
          visible={enquiryOpen}
          submitting={createEnquiry.isPending}
          onClose={() => setEnquiryOpen(false)}
          onSubmit={(body: {
            intent: EnquiryIntent;
            message: string;
            contactEmail?: string;
            contactPhone?: string;
          }) => {
            if (!listingId) return;
            createEnquiry.mutate(
              { listingId, ...body },
              {
                onSuccess: (enquiry) => {
                  setEnquiryOpen(false);
                  if (body.intent === 'viewing') {
                    Alert.alert(t('enquiry.sent'), t('viewings.bookAfterEnquiry'), [
                      { text: t('viewings.done'), style: 'cancel' },
                      {
                        text: t('viewings.bookCta'),
                        onPress: () =>
                          router.push(`/booking/${listingId}?enquiryId=${enquiry.id}`),
                      },
                    ]);
                  } else {
                    Alert.alert(t('enquiry.sent'));
                  }
                },
                onError: () => Alert.alert(t('common.error')),
              },
            );
          }}
        />

        {similar && similar.length > 0 ? (
          <>
            <Text style={[styles.simH, { color: theme.colors.text }]}>
              {t('discovery.detail.similar')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.simRow}>
              {similar.map((s) => (
                <Pressable
                  key={s.listingId}
                  onPress={() => router.push(`/listing/${s.listingId}`)}
                  style={[
                    styles.simCard,
                    { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
                  ]}
                >
                  {s.thumbnailUrl ? (
                    <Image source={{ uri: s.thumbnailUrl }} style={styles.simThumb} />
                  ) : (
                    <View style={[styles.simThumb, { backgroundColor: theme.colors.border }]} />
                  )}
                  <Text style={[styles.simPrice, { color: theme.colors.text }]}>
                    {euro(s.priceCents)}
                  </Text>
                  <Text numberOfLines={1} style={[styles.simTitle, { color: theme.colors.textMuted }]}>
                    {s.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Fact({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.fact, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.factValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.factLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  gallery: { height: 260 },
  photo: { width: 400, height: 260 },
  pad: { padding: 16 },
  price: { fontSize: 26, fontWeight: '800' },
  perM2: { fontSize: 13, marginTop: 2 },
  title: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  addr: { fontSize: 13, marginTop: 2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  fact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  factValue: { fontSize: 15, fontWeight: '700' },
  factLabel: { fontSize: 11, marginTop: 2 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  energyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  energyText: { color: '#0b1220', fontWeight: '800' },
  perf: { fontSize: 12 },
  desc: { fontSize: 14, lineHeight: 21, marginTop: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  catastal: { fontSize: 12, fontStyle: 'italic', marginTop: 14 },
  miniMap: { height: 160, borderRadius: 12, marginTop: 18 },
  cta: { paddingVertical: 16, alignItems: 'center', marginTop: 18 },
  ctaSecondary: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
  },
  simH: { fontSize: 16, fontWeight: '700', marginTop: 26 },
  simRow: { marginTop: 12 },
  simCard: { width: 150, padding: 8, marginRight: 10 },
  simThumb: { width: 134, height: 90, borderRadius: 8 },
  simPrice: { fontSize: 14, fontWeight: '800', marginTop: 6 },
  simTitle: { fontSize: 12, marginTop: 2 },
});
