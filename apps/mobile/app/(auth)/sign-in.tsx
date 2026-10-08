import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriButton, ScreenScroll } from '../../src/components/shell/ui';
import { useFlow } from '../../src/flow/FlowProvider';
import { NAV, toHref } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

const mark = require('../../assets/brand/easycasa-italia-mark.png');

/** Frame 18 — OIDC handoff. No password field in the app. */
export default function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const flow = useFlow();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onContinue = async () => {
    setBusy(true);
    setNote(null);
    const result = await flow.continueSignIn();
    setBusy(false);
    if (result === 'cancel') {
      setNote('Accesso annullato. Puoi riprovare.');
      return;
    }
    if (result === 'device') {
      setNote('Sessione aperta su questo dispositivo. La pagina sicura non ha risposto.');
    }
    const dest = flow.consumeReturnTo() ?? (flow.role === 'seller' ? NAV.profileSeller : NAV.profileSeeker);
    router.replace(toHref(dest));
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(20,33,46,0.12)' }}>
        <Text
          accessibilityLabel="Indietro"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(NAV.profileSeeker))}
          style={{ width: 44, textAlign: 'center', fontSize: 22, color: theme.colors.text }}
        >
          ‹
        </Text>
        <Text style={{ fontFamily: theme.font.display, fontSize: 18, color: theme.colors.text }}>Accedi</Text>
      </View>
      <ScreenScroll
        footer={
          <View style={{ gap: 8 }}>
            <PriButton label={busy ? 'Apertura…' : 'Continua'} onPress={() => void onContinue()} disabled={busy} />
            <Text style={{ textAlign: 'center', fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textMuted }}>
              Accedendo accetti i{' '}
              <Text onPress={() => router.push(NAV.perimeter)} style={{ color: theme.colors.primary }}>
                Termini
              </Text>{' '}
              e l’Informativa privacy.
            </Text>
          </View>
        }
      >
        <View style={{ padding: 24, paddingTop: 36, gap: 18 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: theme.colors.cream, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={mark} style={{ width: 58, height: 58 }} />
          </View>
          <Text style={{ fontFamily: theme.font.display, fontSize: 28, color: theme.colors.text }}>Accedi a EasyCasa</Text>
          <Text style={{ fontFamily: theme.font.body, fontSize: 16, lineHeight: 22, color: theme.colors.textMuted }}>
            Si apre la pagina di accesso sicura di EasyCasa. Email e password non passano dall’app.
          </Text>
          <View style={{ backgroundColor: theme.colors.cream, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(20,33,46,0.10)' }}>
            <Text style={{ fontFamily: theme.font.body, fontSize: 15, color: theme.colors.text }}>
              Entri con la stessa email e password del sito easycasaita.com.
            </Text>
            <Text style={{ fontFamily: theme.font.body, fontSize: 15, color: theme.colors.text }}>
              Non hai un account? Lo crei nella stessa pagina, in un minuto.
            </Text>
            <Text style={{ fontFamily: theme.font.mono, fontSize: 12, color: theme.colors.textMuted }}>
              auth.easycasaita.com
            </Text>
          </View>
          {note ? (
            <Text style={{ fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textMuted }}>{note}</Text>
          ) : null}
        </View>
      </ScreenScroll>
    </View>
  );
}
