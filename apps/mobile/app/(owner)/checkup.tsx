import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackHeader, Body, PriButton, ScreenScroll } from '../../src/components/shell/ui';
import { NAV } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

const CHECKS = [
  'Visura catastale',
  'Planimetria catastale',
  'Atto di provenienza',
  'Carte del condominio',
  'Attestato di prestazione energetica',
];

/** Frame 28 — flat fee only. Payment stays on the website. */
export default function CheckupScreen() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader title="Check-up documentale" onBack={() => router.replace(NAV.documents)} />
      <ScreenScroll
        footer={
          <PriButton
            label="Continua su easycasaita.com"
            onPress={() => {
              void Linking.openURL('https://easycasaita.com/it/pricing');
              router.push(NAV.receipt);
            }}
          />
        }
      >
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ fontFamily: theme.font.display, fontSize: 26, color: theme.colors.text }}>
            Sai cosa hai, cosa manca e chi lo rilascia
          </Text>
          <Body>Controlliamo i documenti della casa e ti consegniamo una relazione scritta.</Body>
          <View style={{ backgroundColor: theme.colors.cream, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(20,33,46,0.10)', gap: 4 }}>
            <Text style={{ fontFamily: theme.font.mono, fontSize: 12, color: theme.colors.textMuted }}>PREZZO FISSO</Text>
            <Text style={{ fontFamily: theme.font.display, fontSize: 28, color: theme.colors.text }}>€ 149 + IVA 22%</Text>
            <Text style={{ fontFamily: theme.font.mono, fontSize: 16, color: theme.colors.text }}>€ 181,78</Text>
            <Body>IVA inclusa. Uguale per ogni casa, indicato prima dell’ordine. Nessuna percentuale sulla vendita.</Body>
          </View>
          {CHECKS.map((item) => (
            <Text key={item} style={{ fontFamily: theme.font.body, fontSize: 16, color: theme.colors.text }}>
              · {item}
            </Text>
          ))}
          <Body>
            Non contiene giudizi di sanabilità né valutazioni legali. Dove serve una firma, la mette un tecnico abilitato.
          </Body>
          <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>
            Nell’app non si paga. La ricevuta torna qui.
          </Text>
        </View>
      </ScreenScroll>
    </View>
  );
}
