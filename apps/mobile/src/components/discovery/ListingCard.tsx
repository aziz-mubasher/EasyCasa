import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ListingPin } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

function euro(cents: number): string {
  const e = Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€ ${e}`;
}

export function ListingCard({ pin, onPress }: { pin: ListingPin; onPress: (id: string) => void }) {
  const theme = useTheme();
  const perM2 = pin.areaM2 > 0 ? Math.round(pin.priceCents / pin.areaM2 / 100) : null;
  return (
    <Pressable
      onPress={() => onPress(pin.listingId)}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
    >
      {pin.thumbnailUrl ? (
        <Image source={{ uri: pin.thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: theme.colors.border }]} />
      )}
      <View style={styles.body}>
        <Text style={[styles.price, { color: theme.colors.text }]}>{euro(pin.priceCents)}</Text>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>{pin.title}</Text>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
          {pin.rooms} loc · {pin.areaM2} m²{perM2 ? ` · € ${perM2}/m²` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 8, marginBottom: 8 },
  thumb: { width: 96, height: 72, borderRadius: 8 },
  body: { flex: 1, justifyContent: 'center', gap: 2 },
  price: { fontSize: 16, fontWeight: '800' },
  title: { fontSize: 13, fontWeight: '600' },
  meta: { fontSize: 12 },
});
