import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OwnerTabBar } from '../../src/components/shell/OwnerTabBar';
import { visitPath } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

/** Frame 10. */
export default function VisitsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 14 }}>
        <Text style={{ fontFamily: theme.font.display, fontSize: 28, color: theme.colors.text }}>Visite</Text>
        <Text style={{ fontFamily: theme.font.body, fontSize: 16, color: theme.colors.textMuted }}>
          Pubblichi gli orari, chi visita prenota. Nessuna telefonata.
        </Text>
        <Text style={{ fontFamily: theme.font.mono, fontSize: 13, color: theme.colors.text }}>
          Gestione visite · € 99 / 90 giorni
        </Text>
        <Pressable
          onPress={() => router.push(visitPath('aperta'))}
          style={{ backgroundColor: theme.colors.cream, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(20,33,46,0.10)', gap: 4 }}
        >
          <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.text }}>Visita aperta</Text>
          <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>sab 11 ott · 10:00–12:00 · 3 / 7 prenotati</Text>
          <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.primary, marginTop: 6 }}>Apri i contatti</Text>
        </Pressable>
        <View style={{ backgroundColor: theme.colors.cream, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(20,33,46,0.10)', gap: 4 }}>
          <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.text }}>Martedì e giovedì</Text>
          <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>17:00–19:00 · 30 min · 2 prenotati</Text>
        </View>
      </View>
      <OwnerTabBar active="visits" />
    </View>
  );
}
