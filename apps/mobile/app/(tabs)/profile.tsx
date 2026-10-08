import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../src/auth/AuthProvider';
import { useApi } from '../../src/api/client';
import { registerForPush } from '../../src/notifications/push';
import { setLocale, SUPPORTED_LOCALES, type SupportedLocale } from '../../src/i18n';
import { useTheme } from '../../src/theme/useTheme';

const LOCALE_LABEL: Record<SupportedLocale, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
};

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, signIn, signOut } = useAuth();
  const api = useApi();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe(),
    enabled: isAuthenticated,
  });

  const showPro =
    isAuthenticated && (me.data?.role === 'professional' || me.data?.role === 'admin');

  const currentLocale = (SUPPORTED_LOCALES.includes(i18n.language as SupportedLocale)
    ? i18n.language
    : 'it') as SupportedLocale;

  const cycleLocale = () => {
    const idx = SUPPORTED_LOCALES.indexOf(currentLocale);
    const next = SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length];
    void setLocale(next);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.root, { paddingTop: insets.top + 20, paddingBottom: 40 }]}
    >
      <Text
        style={{
          fontFamily: theme.font.display,
          fontSize: 28,
          letterSpacing: -0.4,
          color: theme.colors.text,
          marginBottom: 4,
        }}
      >
        Profilo
      </Text>

      {!isAuthenticated ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.cream,
              borderColor: 'rgba(20,33,46,0.10)',
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Image
            source={require('../../assets/brand/easycasa-italia-color.png')}
            style={{ height: 34, width: 160, resizeMode: 'contain', alignSelf: 'flex-start' }}
          />
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: theme.font.display, fontSize: 22, color: theme.colors.text }}>
              Accedi a EasyCasa
            </Text>
            <Text style={{ fontFamily: theme.font.body, fontSize: 16, lineHeight: 22, color: theme.colors.textMuted }}>
              Salva i preferiti, sincronizza le ricerche e ricevi avvisi su tutti i dispositivi.
            </Text>
          </View>
          <Pressable
            onPress={() => void signIn()}
            style={[styles.priBtn, { backgroundColor: theme.colors.ink, borderRadius: theme.radius.md }]}
          >
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.inkText }}>
              Accedi o crea un account
            </Text>
          </Pressable>
          <Text style={{ fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textMuted }}>
            Un solo account per cercare casa e per vendere la tua.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.cream,
              borderColor: 'rgba(20,33,46,0.10)',
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text style={{ fontFamily: theme.font.display, fontSize: 22, color: theme.colors.text }}>
            {me.data?.email ?? 'Account'}
          </Text>
          <Pressable
            onPress={() => router.push('/(owner)')}
            style={[styles.priBtn, { backgroundColor: theme.colors.ink, borderRadius: theme.radius.md }]}
          >
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.inkText }}>
              Casa mia
            </Text>
          </Pressable>
          {showPro ? (
            <Pressable onPress={() => router.push('/(pro)')}>
              <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 15, color: theme.colors.primary }}>
                {t('pro.title')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => void registerForPush(api)}>
            <Text style={{ fontFamily: theme.font.displayMed, fontSize: 15, color: theme.colors.text }}>
              {t('profile.notifications')}
            </Text>
          </Pressable>
          <Pressable onPress={() => void signOut()}>
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 15, color: theme.colors.danger }}>
              {t('auth.signOut')}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.lbl}>Senza account</Text>
        <Row
          label={t('profile.language')}
          value={LOCALE_LABEL[currentLocale]}
          onPress={cycleLocale}
          theme={theme}
        />
        <Row label={t('profile.theme')} value="Automatico" onPress={() => undefined} theme={theme} />
      </View>

      <View style={styles.section}>
        <Text style={styles.lbl}>Informazioni</Text>
        <Row
          label="Cosa non facciamo"
          onPress={() => void Linking.openURL('https://easycasaita.com/cosa-non-facciamo')}
          theme={theme}
        />
        <Row
          label="Informativa privacy"
          onPress={() => void Linking.openURL('https://easycasaita.com/privacy')}
          theme={theme}
        />
        <Row
          label="Termini del servizio"
          onPress={() => void Linking.openURL('https://easycasaita.com/termini')}
          theme={theme}
        />
        <Row
          label="Nota sulla mediazione"
          onPress={() => void Linking.openURL('https://easycasaita.com/mediazione')}
          theme={theme}
          last
        />
      </View>

      <Text style={{ fontFamily: theme.font.mono, fontSize: 12, color: theme.colors.textMuted, marginTop: 8 }}>
        Mundida S.r.l. · P.IVA IT04531990986 · Brescia · v1.0.0
      </Text>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  onPress,
  theme,
  last,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { borderBottomColor: last ? 'transparent' : 'rgba(20,33,46,0.12)' },
      ]}
    >
      <Text style={{ fontFamily: theme.font.body, fontSize: 16, color: theme.colors.text, flex: 1 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? (
          <Text style={{ fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textMuted }}>
            {value}
          </Text>
        ) : null}
        <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, gap: 20 },
  card: {
    padding: 20,
    borderWidth: 1,
    gap: 14,
    shadowColor: '#14212e',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  priBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 6 },
  lbl: {
    fontFamily: 'IBMPlexMono_500Medium',
    fontSize: 11,
    letterSpacing: 0.9,
    color: '#4c5d6e',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
});
