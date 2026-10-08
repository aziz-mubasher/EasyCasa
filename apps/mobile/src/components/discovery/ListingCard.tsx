import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ListingPin } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

function euro(cents: number): string {
  const e = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€ ${e}`;
}

const ENERGY: Record<string, string> = {
  A4: '#1f6f5c',
  A3: '#2a8a6e',
  A2: '#3a9a5a',
  A1: '#5aad4a',
  A: '#6bb83a',
  B: '#8fb45a',
  C: '#b8c04a',
  D: '#d9a441',
  E: '#d9893a',
  F: '#d46a3a',
  G: '#c4553b',
};

/** EC-APP-1 design v2 listing card (frame 02). */
export function ListingCard({
  pin,
  onPress,
  onToggleSave,
  saved,
}: {
  pin: ListingPin;
  onPress: (id: string) => void;
  onToggleSave?: (id: string) => void;
  saved?: boolean;
}) {
  const theme = useTheme();
  const energy = pin.energyClass?.toUpperCase?.() ?? null;
  const energyColor = energy ? ENERGY[energy] ?? theme.colors.ochre : null;
  const meta = [
    pin.areaM2 ? `${pin.areaM2} m²` : null,
    pin.rooms ? `${pin.rooms} locali` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onPress(pin.listingId)}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cream,
          borderColor: 'rgba(20,33,46,0.10)',
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={[styles.media, { backgroundColor: theme.colors.sand }]}>
        {pin.thumbnailUrl ? (
          <Image source={{ uri: pin.thumbnailUrl }} style={styles.photo} />
        ) : null}
        <View style={styles.badges}>
          <View style={[styles.tag, { backgroundColor: theme.colors.ink }]}>
            <Text style={{ color: theme.colors.inkText, fontFamily: theme.font.displaySemi, fontSize: 12 }}>
              Privato
            </Text>
          </View>
        </View>
        {onToggleSave ? (
          <Pressable
            onPress={() => onToggleSave(pin.listingId)}
            hitSlop={8}
            style={styles.heart}
            accessibilityLabel={saved ? 'Rimuovi dai salvati' : 'Salva'}
          >
            <Text style={{ fontSize: 18, color: theme.colors.text }}>{saved ? '♥' : '♡'}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text style={{ fontSize: 20, fontFamily: theme.font.mono, color: theme.colors.text }}>
            {euro(pin.priceCents)}
          </Text>
          {energy && energyColor ? (
            <View style={styles.energy}>
              <View style={[styles.energySwatch, { backgroundColor: energyColor }]} />
              <Text style={{ fontSize: 12, fontFamily: theme.font.mono, color: theme.colors.text }}>
                {energy}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={{ fontSize: 17, fontFamily: theme.font.displaySemi, color: theme.colors.text }}
        >
          {pin.title}
        </Text>
        {meta ? (
          <Text style={{ fontSize: 15, color: theme.colors.textMuted, fontFamily: theme.font.mono }}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#14212e',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  media: { height: 176, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  badges: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', gap: 6 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  heart: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(251,248,241,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 5 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  energy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  energySwatch: { width: 12, height: 12, borderRadius: 3 },
});
