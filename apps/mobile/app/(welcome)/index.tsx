import React from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { setLocale, SUPPORTED_LOCALES, type SupportedLocale } from '../../src/i18n';
import { useTheme } from '../../src/theme/useTheme';

const logo = require('../../assets/brand/easycasa-italia-color.png');
const hero = require('../../assets/brand/hero-terrace.jpg');
const cardThumb = require('../../assets/brand/card-interior.jpg');

export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.pad,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <View style={styles.topRow}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Easy Casa Italia" />
        <View style={[styles.langWrap, { backgroundColor: theme.colors.sand }]}>
          {SUPPORTED_LOCALES.map((loc: SupportedLocale) => {
            const on = i18n.language === loc;
            return (
              <Pressable
                key={loc}
                onPress={() => void setLocale(loc)}
                style={[styles.lang, on && { backgroundColor: theme.colors.cream }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text
                  style={[
                    styles.langText,
                    { color: on ? theme.colors.text : theme.colors.textMuted, fontFamily: theme.font.mono },
                  ]}
                >
                  {loc.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ImageBackground source={hero} style={styles.hero} imageStyle={styles.heroImg}>
        <View style={styles.heroShade} />
        <View style={[styles.heroCard, { backgroundColor: theme.colors.cream }]}>
          <View>
            <Image source={cardThumb} style={styles.thumb} />
            <View style={[styles.privTag, { backgroundColor: theme.colors.ink }]}>
              <Text style={{ color: theme.colors.inkText, fontFamily: theme.font.displaySemi, fontSize: 11 }}>
                {t('welcome.heroBadgePrivate')}
              </Text>
            </View>
          </View>
          <Text style={[styles.price, { color: theme.colors.text, fontFamily: theme.font.mono }]}>
            {t('welcome.heroPrice')}
          </Text>
          <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: theme.font.displaySemi }]} numberOfLines={1}>
            {t('welcome.heroTitle')}
          </Text>
          <Text style={[styles.cardPlace, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {t('welcome.heroPlace')}
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.copy}>
        <Text style={[styles.h1, { color: theme.colors.text, fontFamily: theme.font.display }]}>
          {t('welcome.headline')}
          {'\n'}
          <Text style={{ color: theme.colors.primary }}>{t('welcome.headlineAccent')}</Text>
        </Text>
        <Text style={[styles.body, { color: theme.colors.textMuted, fontFamily: theme.font.body }]}>
          {t('welcome.body')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={[styles.role, styles.roleDark, { backgroundColor: theme.colors.ink }]}
        >
          <View style={[styles.ic, { backgroundColor: 'rgba(169,200,220,0.16)' }]}>
            <Text style={{ fontSize: 20 }}>⌕</Text>
          </View>
          <View style={styles.roleText}>
            <Text style={[styles.roleTitle, { color: theme.colors.inkText, fontFamily: theme.font.display }]}>
              {t('welcome.seekTitle')}
            </Text>
            <Text style={{ color: '#cfd9df', fontSize: 14, fontFamily: theme.font.body }}>
              {t('welcome.seekSubtitle')}
            </Text>
          </View>
          <Text style={{ color: theme.colors.inkText, fontSize: 22 }}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(owner)')}
          style={[
            styles.role,
            {
              backgroundColor: theme.colors.cream,
              borderColor: 'rgba(20,33,46,0.12)',
              borderWidth: 1,
            },
          ]}
        >
          <View style={[styles.ic, { backgroundColor: theme.colors.sellerIconBg }]}>
            <Text style={{ fontSize: 18, color: theme.colors.sellerIcon }}>⌂</Text>
          </View>
          <View style={styles.roleText}>
            <Text style={[styles.roleTitle, { color: theme.colors.text, fontFamily: theme.font.display }]}>
              {t('welcome.sellTitle')}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontFamily: theme.font.body }}>
              {t('welcome.sellSubtitle')}
            </Text>
          </View>
          <Text style={{ color: theme.colors.text, fontSize: 22 }}>›</Text>
        </Pressable>

        <Text style={[styles.footer, { color: theme.colors.textMuted, fontFamily: theme.font.body }]}>
          {t('welcome.hasAccount')}{' '}
          <Text
            onPress={() => router.push('/(tabs)/profile')}
            style={{ color: theme.colors.primary, fontFamily: theme.font.displaySemi }}
          >
            {t('welcome.signIn')}
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20, flexGrow: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { height: 40, width: 140 },
  langWrap: { flexDirection: 'row', padding: 3, borderRadius: 24, gap: 2 },
  lang: { width: 44, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  langText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  hero: {
    marginTop: 22,
    height: 244,
    borderRadius: 26,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImg: { borderRadius: 26 },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,33,46,0.28)',
  },
  heroCard: {
    margin: 16,
    width: 184,
    borderRadius: 18,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: 92 },
  privTag: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  price: { fontSize: 17, marginTop: 9, marginHorizontal: 12 },
  cardTitle: { fontSize: 14, marginHorizontal: 12 },
  cardPlace: { fontSize: 13, marginHorizontal: 12, marginBottom: 11 },
  copy: { marginTop: 24, gap: 10 },
  h1: { fontSize: 33, lineHeight: 36, letterSpacing: -0.6 },
  body: { fontSize: 17, lineHeight: 24 },
  actions: { marginTop: 'auto', paddingTop: 28, gap: 10 },
  role: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  roleDark: {
    shadowColor: '#14212e',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  ic: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roleText: { flex: 1, gap: 2 },
  roleTitle: { fontSize: 17, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 15, paddingTop: 8 },
});
