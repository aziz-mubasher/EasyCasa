import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OwnerTabBar } from '../../src/components/shell/OwnerTabBar';
import { NAV } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

const DOCS = [
  ['Visura catastale', 'caricato'],
  ['Planimetria catastale', 'caricato'],
  ['APE', 'valido fino al 2033'],
  ['Atto di acquisto', 'caricato'],
  ['Provenienza', 'manca'],
  ['Ipoteche ancora iscritte', 'da verificare'],
  ['Spese condominiali arretrate', 'chiedi all’amm.'],
] as const;

/** Frame 12. Leads to the flat-fee check-up, not a legal opinion. */
export default function DocumentsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 12 }}>
        <Text style={{ fontFamily: theme.font.display, fontSize: 28, color: theme.colors.text }}>Il fascicolo della casa</Text>
        <Text style={{ fontFamily: theme.font.body, fontSize: 16, color: theme.colors.textMuted }}>
          Cosa manca, e cosa potrebbe fermare il rogito. Meglio saperlo prima di un compratore.
        </Text>
        {DOCS.map(([name, status]) => (
          <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(20,33,46,0.10)' }}>
            <Text style={{ fontFamily: theme.font.body, fontSize: 16, color: theme.colors.text, flex: 1 }}>{name}</Text>
            <Text style={{ fontFamily: theme.font.mono, fontSize: 12, color: theme.colors.textMuted }}>{status}</Text>
          </View>
        ))}
        <Text
          onPress={() => router.push(NAV.checkup)}
          style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.primary, marginTop: 8 }}
        >
          Richiedi il fascicolo · € 149
        </Text>
      </View>
      <OwnerTabBar active="documents" />
    </View>
  );
}
