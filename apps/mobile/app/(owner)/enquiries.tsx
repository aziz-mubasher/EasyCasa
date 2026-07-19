import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Enquiry, EnquiryEvent } from '@easycasa/api-client';
import {
  useConvertEnquiry,
  useInboundEnquiries,
  useTransitionEnquiry,
} from '../../src/api/enquiries';
import { EnquiryCard } from '../../src/components/owner/EnquiryCard';
import { useTheme } from '../../src/theme/useTheme';

const ACTIVE: Enquiry['status'][] = ['NEW', 'CONTACTED', 'QUALIFIED'];

export default function EnquiriesInboxScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const { data, isLoading } = useInboundEnquiries();
  const transition = useTransitionEnquiry();
  const convert = useConvertEnquiry();
  const busyId = transition.isPending
    ? transition.variables?.id
    : convert.isPending
      ? convert.variables
      : undefined;

  const onTransition = (id: string, event: EnquiryEvent) => {
    transition.mutate(
      { id, event },
      { onError: (e) => Alert.alert(t('common.error'), e.message) },
    );
  };
  const onConvert = (id: string) => {
    convert.mutate(id, {
      onSuccess: (r) =>
        Alert.alert(
          t('enquiryInbox.converted'),
          t('enquiryInbox.convertedBody', { orderId: r.orderId }),
        ),
      onError: (e) => Alert.alert(t('common.error'), e.message),
    });
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
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.h, { color: theme.colors.text }]}>{t('enquiryInbox.title')}</Text>

      {items.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
          {t('enquiryInbox.empty')}
        </Text>
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
              onConvert={() => onConvert(e.id)}
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
              onConvert={() => onConvert(e.id)}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
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
