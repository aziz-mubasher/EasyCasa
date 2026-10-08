import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Body, H1, PriButton, ScreenScroll } from '../../src/components/shell/ui';
import { NAV } from '../../src/flow/paths';

/** Frame 29 — receipt after the website payment. No percentage line. */
export default function ReceiptScreen() {
  const router = useRouter();
  return (
    <ScreenScroll footer={<PriButton label="Vai al fascicolo" onPress={() => router.replace(NAV.documents)} />}>
      <View style={{ padding: 24, paddingTop: 72, gap: 12 }}>
        <H1>Ordine confermato</H1>
        <Body>Hai pagato su easycasaita.com. Ricevuta e fattura arrivano anche via email.</Body>
        <Text style={{ fontFamily: 'Newsreader_400Regular', fontSize: 16 }}>Servizio · Check-up documentale</Text>
        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 18 }}>Totale · € 181,78 IVA incl.</Text>
        <Body>1. Carica i documenti che hai, dal fascicolo.</Body>
        <Body>2. Li controlliamo. Relazione scritta, senza un giudizio legale.</Body>
        <Body>3. Ti avvisiamo qui e via email.</Body>
        <Body>Fattura emessa da Mundida S.r.l. · P.IVA IT04531990986.</Body>
      </View>
    </ScreenScroll>
  );
}
