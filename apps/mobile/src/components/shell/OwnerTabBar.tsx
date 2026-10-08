import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV } from '../../flow/paths';
import { useTheme } from '../../theme/useTheme';

const TABS = [
  { id: 'home', label: 'Casa', href: NAV.seller },
  { id: 'inbox', label: 'Messaggi', href: NAV.inbox },
  { id: 'visits', label: 'Visite', href: NAV.visits },
  { id: 'documents', label: 'Documenti', href: NAV.documents },
  { id: 'profile', label: 'Profilo', href: NAV.profileSeller },
] as const;

export type OwnerTabId = (typeof TABS)[number]['id'];

export function OwnerTabBar({ active }: { active: OwnerTabId }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 18),
          backgroundColor: 'rgba(251,248,241,0.95)',
          borderTopColor: 'rgba(20,33,46,0.10)',
        },
      ]}
    >
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => router.replace(tab.href)}
            style={styles.tab}
          >
            <Text style={{ fontSize: 16, color: on ? theme.colors.primary : theme.colors.textMuted }}>
              {tab.id === 'home' ? '⌂' : tab.id === 'inbox' ? '✉' : tab.id === 'visits' ? '▦' : tab.id === 'documents' ? '▤' : '☺'}
            </Text>
            <Text
              style={{
                fontFamily: on ? theme.font.displaySemi : theme.font.displayMed,
                fontSize: 11,
                color: on ? theme.colors.text : theme.colors.textMuted,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
});
