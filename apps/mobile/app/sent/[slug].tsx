import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Body, H1, PriButton, ScreenScroll, SecButton } from '../../src/components/shell/ui';
import { bookingPath } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

/** Frame 23. */
export default function EnquirySentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const id = slug ?? 'demo';
  return (
    <ScreenScroll
      footer={
        <View style={{ gap: 10 }}>
          <PriButton label="Prenota una visita" onPress={() => router.push(bookingPath(id))} />
          <SecButton label="Torna all’annuncio" onPress={() => router.replace(`/listing/${id}`)} />
        </View>
      }
    >
      <View style={{ padding: 24, paddingTop: 72, gap: 14 }}>
        <H1>Messaggio inviato</H1>
        <Body>Arriva al proprietario così come l’hai scritto, con la tua dichiarazione. Ti avvisiamo quando risponde.</Body>
        <View style={{ backgroundColor: theme.colors.cream, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: 'rgba(20,33,46,0.10)' }}>
          <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.text }}>Cosa vede il proprietario</Text>
          <Text style={{ fontFamily: theme.font.body, color: theme.colors.text }}>Il tuo nome e la dichiarazione.</Text>
          <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>
            Resta privato fino alla visita: cognome, email, telefono.
          </Text>
        </View>
      </View>
    </ScreenScroll>
  );
}
