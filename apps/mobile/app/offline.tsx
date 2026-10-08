import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Body, H1, PriButton, ScreenScroll } from '../src/components/shell/ui';
import { NAV } from '../src/flow/paths';
import { useTheme } from '../src/theme/useTheme';

/** Frame 30. */
export default function OfflineScreen() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <ScreenScroll
      footer={
        <View style={{ gap: 8 }}>
          <PriButton label="Riprova" onPress={() => router.replace(NAV.search)} />
          <Text
            onPress={() => router.push(NAV.saved)}
            style={{ textAlign: 'center', fontFamily: theme.font.displaySemi, color: theme.colors.primary, fontSize: 16 }}
          >
            Apri i salvati
          </Text>
        </View>
      }
    >
      <View style={{ padding: 24, paddingTop: 80, gap: 12 }}>
        <H1>Sei offline</H1>
        <Body>Controlla la connessione e riprova. I salvati restano su questo dispositivo.</Body>
      </View>
    </ScreenScroll>
  );
}
