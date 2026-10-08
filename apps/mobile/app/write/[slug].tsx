import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCreateEnquiry } from '../../src/api/enquiries';
import { useAuth } from '../../src/auth/AuthProvider';
import { BackHeader, PriButton, ScreenScroll } from '../../src/components/shell/ui';
import { useFlow } from '../../src/flow/FlowProvider';
import { NAV, sentPath } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

/**
 * Frame 05 — write to the owner.
 * Declaration only. No offer intent (T04 rows 10–12).
 */
export default function WriteOwnerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const flow = useFlow();
  const auth = useAuth();
  const createEnquiry = useCreateEnquiry();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const id = slug ?? 'demo';
  const [agent, setAgent] = useState<'no' | 'yes'>('no');
  const [message, setMessage] = useState(
    'Sono interessata a questo annuncio. Il terrazzo è abitabile tutto l’anno? Sarei libera per una visita di sabato.',
  );
  const [privacy, setPrivacy] = useState(false);
  const [mediation, setMediation] = useState(false);
  const ready = privacy && mediation && message.trim().length > 0 && (agent === 'no' || agent === 'yes');

  const finish = () => {
    flow.markEnquirySent();
    if (!flow.state.notificationsAsked) {
      router.push({ pathname: NAV.permNotifications, params: { slug: id } });
      return;
    }
    router.replace(sentPath(id));
  };

  const send = () => {
    if (!flow.isMember) {
      router.push({ pathname: NAV.sessionExpired, params: { slug: id } });
      return;
    }
    const canPost = auth.isAuthenticated && /^[0-9a-f-]{16,}$/i.test(id);
    if (!canPost) {
      finish();
      return;
    }
    createEnquiry.mutate(
      { listingId: id, intent: 'info', message },
      {
        onSuccess: finish,
        onError: () => router.push({ pathname: NAV.sessionExpired, params: { slug: id } }),
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader title="Scrivi al proprietario" onBack={() => router.replace(`/listing/${id}`)} />
      <ScreenScroll footer={<PriButton label="Invia al proprietario" onPress={send} disabled={!ready} />}>
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: theme.font.display, fontSize: 26, color: theme.colors.text }}>
            Scrivi al proprietario
          </Text>
          <Text style={{ fontFamily: theme.font.mono, color: theme.colors.textMuted }}>Annuncio {id}</Text>
          <Text style={{ fontFamily: theme.font.body, fontSize: 16, lineHeight: 22, color: theme.colors.textMuted }}>
            La tua dichiarazione arriva al proprietario così come la scrivi. Nessuno la controlla o le dà un punteggio.
          </Text>
          <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.text }}>
            Sei un agente immobiliare, o scrivi per conto di uno?
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['no', 'yes'] as const).map((value) => (
              <Pressable key={value} onPress={() => setAgent(value)} style={pill(theme, agent === value)}>
                <Text style={{ color: agent === value ? theme.colors.inkText : theme.colors.text, fontFamily: theme.font.displaySemi }}>
                  {value === 'no' ? 'No' : 'Sì'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.text }}>Il tuo messaggio</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            style={{
              minHeight: 120,
              borderWidth: 1,
              borderColor: 'rgba(20,33,46,0.30)',
              borderRadius: 14,
              padding: 14,
              backgroundColor: theme.colors.cream,
              fontFamily: theme.font.body,
              fontSize: 16,
              color: theme.colors.text,
              textAlignVertical: 'top',
            }}
          />
          <Text style={{ fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textMuted }}>
            Il proprietario vede solo il tuo nome. Cognome, email e telefono si scambiano quando entrambi confermate una visita.
          </Text>
          <Check
            on={privacy}
            onPress={() => setPrivacy((v) => !v)}
            label="Ho letto l’informativa privacy. Acconsento che EasyCasa usi email e telefono per gestire questa richiesta."
          />
          <Check
            on={mediation}
            onPress={() => {
              setMediation((v) => !v);
            }}
            label="Prendo visione della nota sulla mediazione."
            extra={() => router.push(NAV.perimeter)}
          />
        </View>
      </ScreenScroll>
    </View>
  );
}

function Check({
  on,
  onPress,
  label,
}: {
  on: boolean;
  onPress: () => void;
  label: string;
  extra?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: theme.colors.ink,
          backgroundColor: on ? theme.colors.ink : 'transparent',
          marginTop: 2,
        }}
      />
      <Text style={{ flex: 1, fontFamily: theme.font.body, fontSize: 15, lineHeight: 21, color: theme.colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function pill(theme: ReturnType<typeof useTheme>, on: boolean) {
  return {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: on ? theme.colors.ink : 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.ink,
  };
}
