import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackHeader, Body, ScreenScroll, SecButton } from '../../../src/components/shell/ui';
import { NAV } from '../../../src/flow/paths';
import { useTheme } from '../../../src/theme/useTheme';

/** Frame 24 — contacts unlock only after both sides confirm. */
export default function VisitConfirmedScreen() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader title="Visita confermata" onBack={() => router.replace(NAV.visits)} />
      <ScreenScroll
        footer={<SecButton label="Torna alle visite" onPress={() => router.replace(NAV.visits)} />}
      >
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ fontFamily: theme.font.display, fontSize: 26, color: theme.colors.text }}>Visita confermata</Text>
          <Body>Confermata da entrambi. Sab 11 ott · 10:30. La casa la mostri tu.</Body>
          <View style={{ backgroundColor: theme.colors.ink, borderRadius: 16, padding: 16, gap: 8 }}>
            <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.inkText }}>Ora vi vedete i contatti</Text>
            <Text style={{ fontFamily: theme.font.body, color: '#e8dfcc' }}>Sbloccati nello stesso momento per tutti e due.</Text>
            <Text style={{ fontFamily: theme.font.display, fontSize: 18, color: theme.colors.inkText }}>Giulia Bianchi</Text>
            <Text
              onPress={() => void Linking.openURL('tel:+393330000000')}
              style={{ fontFamily: theme.font.displaySemi, color: '#a9c8dc' }}
            >
              Chiama
            </Text>
          </View>
          <Body>Documento d’identità mostrato alla conferma. Solo di giorno. Sempre due persone in casa.</Body>
        </View>
      </ScreenScroll>
    </View>
  );
}
