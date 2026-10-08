import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { useFlow } from '../../flow/FlowProvider';
import { NAV } from '../../flow/paths';
import { setLocale, SUPPORTED_LOCALES, type SupportedLocale } from '../../i18n';
import { useTheme } from '../../theme/useTheme';

const LOCALE_LABEL: Record<SupportedLocale, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
};

const logo = require('../../../assets/brand/easycasa-italia-color.png');

export function ProfileBody({ shell }: { shell: 'seeker' | 'seller' }) {
  const theme = useTheme();
  const router = useRouter();
  const { i18n } = useTranslation();
  const flow = useFlow();
  const auth = useAuth();
  const api = useApi();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe(),
    enabled: auth.isAuthenticated,
  });

  const currentLocale = (SUPPORTED_LOCALES.includes(i18n.language as SupportedLocale)
    ? i18n.language
    : 'it') as SupportedLocale;

  const account = flow.state.account;
  const email =
    me.data?.email ?? (account.kind === 'member' ? account.email : null);
  const fromEmail = email?.split('@')[0];
  const name =
    account.kind === 'member' && account.name !== 'Account'
      ? account.name
      : fromEmail && fromEmail.length > 0
        ? fromEmail
        : 'Account';
  const deviceOnly =
    account.kind === 'member' && account.source === 'device' && !auth.isAuthenticated && !me.data?.email;

  const goRole = (role: 'seeker' | 'seller') => {
    flow.chooseRole(role);
    router.replace(role === 'seller' ? NAV.profileSeller : NAV.profileSeeker);
  };

  const signOut = () => {
    void flow.signOut().then(() => router.replace(NAV.profileSeeker));
  };

  return (
    <View style={{ gap: 20 }}>
      <Text style={{ fontFamily: theme.font.display, fontSize: 28, color: theme.colors.text }}>Profilo</Text>

      {flow.isMember ? (
        <View style={[styles.card, { backgroundColor: theme.colors.cream, borderRadius: theme.radius.lg }]}>
          <View style={styles.person}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.sand }]}>
              <Text style={{ fontFamily: theme.font.display, fontSize: 18, color: theme.colors.text }}>
                {name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: theme.font.display, fontSize: 20, color: theme.colors.text }}>{name}</Text>
              <Text style={{ fontFamily: theme.font.body, fontSize: 15, color: theme.colors.textMuted }}>
                {email ?? (deviceOnly ? 'Sessione su questo dispositivo' : 'Account')}
              </Text>
            </View>
          </View>
          {deviceOnly ? (
            <Text style={{ fontFamily: theme.font.body, fontSize: 14, lineHeight: 20, color: theme.colors.textMuted }}>
              La pagina sicura di EasyCasa non ha completato l’accesso. Esci e riprova per sincronizzare l’account.
            </Text>
          ) : null}
          <View style={[styles.seg, { backgroundColor: theme.colors.sand }]}>
            <Pressable
              onPress={() => goRole('seeker')}
              style={[styles.segItem, shell === 'seeker' && { backgroundColor: theme.colors.cream }]}
            >
              <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 14, color: theme.colors.text }}>
                Cerco casa
              </Text>
            </Pressable>
            <Pressable
              onPress={() => goRole('seller')}
              style={[styles.segItem, shell === 'seller' && { backgroundColor: theme.colors.cream }]}
            >
              <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 14, color: theme.colors.text }}>
                Vendo casa
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.colors.cream, borderRadius: theme.radius.lg }]}>
          <Image source={logo} style={{ height: 34, width: 160 }} resizeMode="contain" accessibilityLabel="Easy Casa Italia" />
          <Text style={{ fontFamily: theme.font.display, fontSize: 22, color: theme.colors.text }}>
            Accedi a EasyCasa
          </Text>
          <Text style={{ fontFamily: theme.font.body, fontSize: 16, lineHeight: 22, color: theme.colors.textMuted }}>
            Salva i preferiti, sincronizza le ricerche e ricevi avvisi su tutti i dispositivi.
          </Text>
          <Pressable
            onPress={() => {
              flow.setReturnTo(shell === 'seller' ? NAV.profileSeller : NAV.profileSeeker);
              router.push(NAV.signIn);
            }}
            style={[styles.pri, { backgroundColor: theme.colors.ink, borderRadius: theme.radius.md }]}
          >
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.inkText }}>
              Accedi o crea un account
            </Text>
          </Pressable>
          <Text style={{ fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textMuted }}>
            Un solo account per cercare casa e per vendere la tua.
          </Text>
        </View>
      )}

      <Section title={flow.isMember ? 'IMPOSTAZIONI' : 'SENZA ACCOUNT'}>
        <Row
          label="Lingua"
          value={LOCALE_LABEL[currentLocale]}
          onPress={() => {
            const idx = SUPPORTED_LOCALES.indexOf(currentLocale);
            const next = SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length] ?? 'it';
            void setLocale(next);
          }}
        />
        {flow.isMember ? (
          <Row label="Notifiche" value="messaggi, visite" onPress={() => router.push(NAV.permNotifications)} />
        ) : (
          <Row label="Aspetto" value="Automatico" onPress={() => undefined} />
        )}
        {flow.isMember ? (
          <Row
            label="Ricerche salvate"
            value={String(flow.state.savedSearches.length)}
            onPress={() => router.push(NAV.saved)}
          />
        ) : null}
      </Section>

      <Section title={flow.isMember ? 'I TUOI DATI' : 'INFORMAZIONI'}>
        <Row label="Cosa non facciamo" onPress={() => router.push(NAV.perimeter)} />
        <Row
          label="Informativa privacy"
          onPress={() => void Linking.openURL('https://easycasaita.com/it/privacy')}
        />
        <Row
          label="Termini del servizio"
          onPress={() => void Linking.openURL('https://easycasaita.com/it/termini')}
        />
        {!flow.isMember ? (
          <Row
            label="Nota sulla mediazione"
            onPress={() => void Linking.openURL('https://easycasaita.com/it/mediazione-e-provvigione')}
          />
        ) : (
          <>
            <Row
              label="Scarica i miei dati"
              onPress={() => void Linking.openURL('https://easycasaita.com/it/i-miei-dati')}
            />
            <Row
              label="Elimina l'account"
              onPress={() => void Linking.openURL('https://easycasaita.com/it/i-miei-dati')}
            />
            <Row label="Esci" danger onPress={signOut} />
          </>
        )}
      </Section>

      <Text style={{ fontFamily: theme.font.mono, fontSize: 12, color: theme.colors.textMuted }}>
        Mundida S.r.l. · P.IVA IT04531990986 · Brescia · v1.0.0
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: theme.font.mono, fontSize: 11, letterSpacing: 0.8, color: theme.colors.textMuted }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  danger,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: 'rgba(20,33,46,0.12)' }]}>
      <Text
        style={{
          fontFamily: theme.font.body,
          fontSize: 16,
          color: danger ? theme.colors.danger : theme.colors.text,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>
        {value ? `${value}  ›` : '›'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderWidth: 1, borderColor: 'rgba(20,33,46,0.10)', gap: 14 },
  person: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  pri: { height: 52, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', padding: 3, borderRadius: 14, gap: 3 },
  segItem: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
});
