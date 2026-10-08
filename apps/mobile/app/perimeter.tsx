import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackHeader, Body, ScreenScroll } from '../src/components/shell/ui';
import { NAV } from '../src/flow/paths';
import { useTheme } from '../src/theme/useTheme';

const ROWS = [
  ['01', 'Non parliamo con i compratori al posto tuo.', 'Né al telefono, né durante la visita.'],
  ['02', 'Non diamo voti alle persone.', 'Niente punteggi, niente badge. Mostriamo documenti e dichiarazioni, così come sono.'],
  ['03', 'Non scegliamo chi ti scrive.', "Nessun messaggio viene scartato. L'ordine lo decidi tu."],
  ['04', 'Non accompagniamo le visite.', 'Organizziamo gli orari. La casa la mostri tu, o chi scegli tu.'],
  ['05', 'Non scriviamo proposte né preliminari.', 'Li fa un avvocato che incarichi tu.'],
  ['06', 'Non ti mandiamo da una banca.', 'E non riceviamo nulla da chi ti propone un mutuo.'],
] as const;

/** Frame 14 — consumer form of T04 rows 10–12. No offers, no negotiation. */
export default function PerimeterScreen() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader title="Cosa non facciamo" onBack={() => router.back()} />
      <ScreenScroll>
        <View style={{ padding: 20, gap: 18 }}>
          <Text style={{ fontFamily: theme.font.display, fontSize: 28, color: theme.colors.text }}>
            Cosa non facciamo, mai.
          </Text>
          {ROWS.map(([n, title, body]) => (
            <View key={n} style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ fontFamily: theme.font.mono, fontSize: 13, color: theme.colors.primary, width: 28 }}>
                {n}
              </Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.text }}>{title}</Text>
                <Body>{body}</Body>
              </View>
            </View>
          ))}
          <Text
            onPress={() => void Linking.openURL('https://easycasaita.com/it/mediazione-e-provvigione')}
            style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.primary }}
          >
            Leggi la nota sulla mediazione
          </Text>
          <Text
            onPress={() => router.replace(NAV.profileSeeker)}
            style={{ fontFamily: theme.font.displayMed, fontSize: 15, color: theme.colors.textMuted }}
          >
            Torna al profilo
          </Text>
        </View>
      </ScreenScroll>
    </View>
  );
}
