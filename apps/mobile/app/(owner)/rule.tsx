import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackHeader, Body, PriButton, ScreenScroll } from '../../src/components/shell/ui';
import { NAV } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

const OPTIONS = [
  'Non è un agente immobiliare',
  'Ha indicato quando vuole comprare',
  'Ha letto la classe energetica',
  'Cerca casa per sé',
];

/** Frame 09 — order only, never exclusion. */
export default function InboxRuleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [on, setOn] = useState<Record<string, boolean>>({});
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader title="La tua regola" onBack={() => router.replace(NAV.inbox)} />
      <ScreenScroll footer={<PriButton label="Salva e pubblica la regola" onPress={() => router.replace(NAV.inbox)} />}>
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ fontFamily: theme.font.display, fontSize: 26, color: theme.colors.text }}>Decidi tu chi leggere per primo.</Text>
          <Body>Nessun messaggio viene bloccato o scartato: cambia solo l’ordine. Senza una regola, arrivano in ordine di arrivo.</Body>
          {OPTIONS.map((label) => (
            <Pressable key={label} onPress={() => setOn((curr) => ({ ...curr, [label]: !curr[label] }))} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: theme.colors.ink, backgroundColor: on[label] ? theme.colors.ink : 'transparent' }} />
              <Text style={{ flex: 1, fontFamily: theme.font.body, fontSize: 16, color: theme.colors.text }}>{label}</Text>
            </Pressable>
          ))}
          <Body>Le condizioni sono dichiarazioni di chi scrive. Noi non controlliamo e non valutiamo le persone.</Body>
        </View>
      </ScreenScroll>
    </View>
  );
}
