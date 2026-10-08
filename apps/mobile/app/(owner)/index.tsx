import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { OwnerProperty } from '@easycasa/api-client';
import { useInboundEnquiries } from '../../src/api/enquiries';
import { useMyProperties } from '../../src/api/owner-hooks';
import { useAuth } from '../../src/auth/AuthProvider';
import { OwnerTabBar } from '../../src/components/shell/OwnerTabBar';
import { NAV, publishPath } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

export default function OwnerHome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, ready } = useAuth();
  const { data, isLoading, isError, refetch } = useMyProperties();
  const { data: inbound } = useInboundEnquiries();
  const newCount = (inbound ?? []).filter((e) => e.status === 'NEW').length;
  const primary: OwnerProperty | undefined = (data ?? [])[0];
  const statusLabel = primary?.status === 'published' || primary?.status === 'PUBLISHED'
    ? 'PUBBLICATO'
    : (primary?.status ?? 'BOZZA').toUpperCase();

  if (!ready || (isAuthenticated && isLoading)) {
    return (
      <View style={[styles.centerFill, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError && isAuthenticated) {
    return (
      <View style={[styles.centerFill, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.danger, fontFamily: theme.font.displaySemi }}>
          {t('common.error')}
        </Text>
        <Pressable onPress={() => void refetch()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.primary, fontFamily: theme.font.displaySemi }}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const heroTitle = primary?.title ?? 'Trilocale con terrazzo';
  const heroMeta = primary
    ? `${t('owner.dealType.' + primary.dealType)} · ${primary.status}`
    : 'Brescia · Centro storico · € 245.000';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.colors.ink,
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <View style={styles.heroTop}>
          <Text style={{ fontFamily: theme.font.monoReg, fontSize: 11, letterSpacing: 0.9, color: '#a9c8dc' }}>
            IL TUO ANNUNCIO · {statusLabel}
          </Text>
        </View>

        {primary || !isAuthenticated ? (
          <View style={styles.heroBody}>
            <View style={[styles.heroThumb, { backgroundColor: 'rgba(243,237,225,0.18)' }]}>
              <Text style={{ fontSize: 28 }}>⌂</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  fontFamily: theme.font.display,
                  fontSize: 24,
                  lineHeight: 28,
                  color: theme.colors.inkText,
                }}
              >
                {heroTitle}
              </Text>
              <Text style={{ fontSize: 16, color: '#e8dfcc', fontFamily: theme.font.body }}>
                {heroMeta}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: theme.font.display, fontSize: 24, color: theme.colors.inkText }}>
              Casa mia
            </Text>
            <Text style={{ fontSize: 16, color: '#e8dfcc', fontFamily: theme.font.body }}>
              {t('owner.empty')}
            </Text>
          </View>
        )}

        <View style={[styles.promises, { borderTopColor: 'rgba(169,200,220,0.3)' }]}>
          <Text style={{ fontSize: 16, color: '#e8dfcc', fontFamily: theme.font.body }}>
            🔒  Il tuo numero non è mai pubblicato.
          </Text>
          <Text style={{ fontSize: 16, color: '#e8dfcc', fontFamily: theme.font.body }}>
            📅  Non concorderai mai un orario al telefono.
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.grid}>
          <Tile
            label="MESSAGGI NUOVI"
            big={String(newCount)}
            sub={newCount > 0 ? t('enquiryInbox.badgeNew', { count: newCount }) : 'Nessun messaggio nuovo'}
            onPress={() => router.push(NAV.inbox)}
            theme={theme}
          />
          <Tile
            label="PROSSIMA VISITA"
            big="—"
            sub="Apri le visite"
            onPress={() => router.push(NAV.visits)}
            theme={theme}
            monoBig={false}
          />
        </View>

        <Pressable
            onPress={() => router.push(NAV.documents)}
            style={[
              styles.tile,
              {
                backgroundColor: theme.colors.cream,
                borderColor: 'rgba(20,33,46,0.10)',
                borderRadius: theme.radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              },
            ]}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.lbl}>FASCICOLO DELLA CASA</Text>
                <Text style={{ fontFamily: theme.font.mono, fontSize: 13, color: theme.colors.text }}>
                  —
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: theme.colors.sand, borderRadius: 2 }}>
                <View style={{ width: '40%', height: 6, backgroundColor: theme.colors.primary, borderRadius: 2 }} />
              </View>
              <Text style={{ fontSize: 15, fontFamily: theme.font.body, color: theme.colors.text }}>
                {t('owner.fascicolo.title')}
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: theme.colors.text }}>›</Text>
          </Pressable>

        <View
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.cream,
              borderColor: 'rgba(20,33,46,0.10)',
              borderRadius: theme.radius.md,
              gap: 10,
            },
          ]}
        >
          <Text style={styles.lbl}>L&apos;ANNUNCIO</Text>
          <Pressable onPress={() => router.push(publishPath('basics'))} style={styles.listRow}>
            <Text style={{ fontSize: 15, fontFamily: theme.font.body, color: theme.colors.text }}>
              Pubblica o riprendi la bozza
            </Text>
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 14, color: theme.colors.primary }}>Apri</Text>
          </Pressable>
          <Pressable onPress={() => router.push(NAV.rule)} style={styles.listRow}>
            <Text style={{ fontSize: 15, fontFamily: theme.font.body, color: theme.colors.text }}>
              La tua regola sui messaggi
            </Text>
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 14, color: theme.colors.primary }}>Modifica</Text>
          </Pressable>
          <Pressable onPress={() => router.push(NAV.perimeter)} style={styles.listRow}>
            <Text style={{ fontSize: 15, fontFamily: theme.font.body, color: theme.colors.text }}>
              Nessuna esclusiva. Come funziona
            </Text>
            <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 14, color: theme.colors.primary }}>Apri</Text>
          </Pressable>
        </View>

        {(data ?? []).length > 1 ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.lbl}>ALTRI ANNUNCI</Text>
            {(data ?? []).slice(1).map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/(owner)/${p.id}/fascicolo`)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.colors.cream,
                    borderColor: 'rgba(20,33,46,0.10)',
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.text }}>
                  {p.title ?? t('owner.untitled')}
                </Text>
                <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>
                  {t('owner.dealType.' + p.dealType)} · {p.status}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text
          style={{
            fontSize: 14,
            color: theme.colors.textMuted,
            lineHeight: 20,
            fontFamily: theme.font.body,
          }}
        >
          Nessuna esclusiva, nessun contratto. Puoi anche affidarti a un&apos;agenzia.
        </Text>
      </View>
    </ScrollView>
    <OwnerTabBar active="home" />
    </View>
  );
}

function Tile({
  label,
  big,
  sub,
  onPress,
  theme,
  monoBig = true,
}: {
  label: string;
  big: string;
  sub: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  monoBig?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tile,
        {
          flex: 1,
          backgroundColor: theme.colors.cream,
          borderColor: 'rgba(20,33,46,0.10)',
          borderRadius: theme.radius.md,
          gap: 6,
        },
      ]}
    >
      <Text style={styles.lbl}>{label}</Text>
      <Text
        style={{
          fontFamily: monoBig ? theme.font.mono : theme.font.mono,
          fontSize: monoBig ? 26 : 17,
          color: theme.colors.text,
        }}
      >
        {big}
      </Text>
      <Text style={{ fontSize: 14, color: theme.colors.textMuted, fontFamily: theme.font.body }}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroThumb: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promises: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  body: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  grid: { flexDirection: 'row', gap: 10 },
  tile: {
    padding: 14,
    borderWidth: 1,
    shadowColor: '#14212e',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  lbl: {
    fontFamily: 'IBMPlexMono_400Regular',
    fontSize: 11,
    letterSpacing: 0.9,
    color: '#4c5d6e',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priBtn: {
    height: 52,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
});
