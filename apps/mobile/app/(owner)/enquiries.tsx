import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { Enquiry, EnquiryEvent } from '@easycasa/api-client';
import { useInboundEnquiries, useTransitionEnquiry } from '../../src/api/enquiries';
import { EnquiryCard } from '../../src/components/owner/EnquiryCard';
import { OwnerTabBar } from '../../src/components/shell/OwnerTabBar';
import { NAV } from '../../src/flow/paths';
import { useTheme } from '../../src/theme/useTheme';

const ACTIVE: Enquiry['status'][] = ['NEW', 'CONTACTED'];

export default function EnquiriesInboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { data, isLoading } = useInboundEnquiries();
  const transition = useTransitionEnquiry();
  const busyId = transition.isPending ? transition.variables?.id : undefined;

  const onTransition = (id: string, event: EnquiryEvent) => {
    transition.mutate(
      { id, event },
      { onError: (e) => Alert.alert(t('common.error'), e.message) },
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const items = data ?? [];
  const active = items.filter((e) => ACTIVE.includes(e.status));
  const done = items.filter((e) => !ACTIVE.includes(e.status));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={[styles.h, { color: theme.colors.text }]}>{t('enquiryInbox.title')}</Text>
        <Pressable onPress={() => router.push(NAV.rule)}>
          <Text style={{ fontFamily: theme.font.displayMed, fontSize: 15, color: theme.colors.primary }}>La tua regola</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
            {t('enquiryInbox.empty')}
          </Text>
          <Pressable onPress={() => router.push(NAV.visits)}>
            <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.primary }}>Proponi i tuoi orari</Text>
          </Pressable>
        </View>
      ) : null}

      {active.length > 0 ? (
        <>
          <Text style={[styles.section, { color: theme.colors.textMuted }]}>
            {t('enquiryInbox.needsAttention')}
          </Text>
          {active.map((e) => (
            <EnquiryCard
              key={e.id}
              enquiry={e}
              busy={busyId === e.id}
              onTransition={(ev) => onTransition(e.id, ev)}
            />
          ))}
        </>
      ) : null}

      {done.length > 0 ? (
        <>
          <Text style={[styles.section, { color: theme.colors.textMuted }]}>
            {t('enquiryInbox.done')}
          </Text>
          {done.map((e) => (
            <EnquiryCard
              key={e.id}
              enquiry={e}
              busy={busyId === e.id}
              onTransition={(ev) => onTransition(e.id, ev)}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
    <OwnerTabBar active="inbox" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 10,
  },
});
