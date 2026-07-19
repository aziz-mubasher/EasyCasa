import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Enquiry, EnquiryEvent, EnquiryStatus } from '@easycasa/api-client';
import { EnquiryStatusPill } from './EnquiryStatusPill';
import { useTheme } from '../../theme/useTheme';

interface Action {
  event: EnquiryEvent;
  key: string;
  primary?: boolean;
}

/** Lifecycle actions offered per status (mirrors the Phase 24 machine). */
const ACTIONS: Record<EnquiryStatus, Action[]> = {
  NEW: [
    { event: 'CONTACT', key: 'markContacted', primary: true },
    { event: 'CLOSE', key: 'close' },
  ],
  CONTACTED: [
    { event: 'QUALIFY', key: 'qualify', primary: true },
    { event: 'CLOSE', key: 'close' },
  ],
  QUALIFIED: [{ event: 'CLOSE', key: 'close' }],
  CONVERTED: [],
  CLOSED: [{ event: 'REOPEN', key: 'reopen' }],
};

export function EnquiryCard({
  enquiry,
  busy,
  onTransition,
  onConvert,
}: {
  enquiry: Enquiry;
  busy: boolean;
  onTransition: (event: EnquiryEvent) => void;
  onConvert: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const actions = ACTIONS[enquiry.status];
  const contact = enquiry.contactEmail ?? enquiry.contactPhone ?? '';

  return (
    <View
      style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
    >
      <View style={styles.head}>
        <Text style={[styles.intent, { color: theme.colors.text }]}>
          {t(`enquiryInbox.intents.${enquiry.intent}`)}
        </Text>
        <EnquiryStatusPill status={enquiry.status} />
      </View>

      <Text style={[styles.message, { color: theme.colors.text }]} numberOfLines={3}>
        {enquiry.message}
      </Text>
      {contact ? (
        <Text style={[styles.contact, { color: theme.colors.textMuted }]}>{contact}</Text>
      ) : null}
      {enquiry.orderId ? (
        <Text style={[styles.order, { color: theme.colors.primary }]}>
          {t('enquiryInbox.orderCreated')} · {enquiry.orderId.slice(0, 8)}…
        </Text>
      ) : null}

      {busy ? (
        <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} />
      ) : (
        <View style={styles.actions}>
          {enquiry.status === 'QUALIFIED' ? (
            <Pressable
              onPress={onConvert}
              style={[
                styles.btn,
                { backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm },
              ]}
            >
              <Text style={{ color: theme.colors.primaryText, fontWeight: '700', fontSize: 13 }}>
                {t('enquiryInbox.actions.convert')}
              </Text>
            </Pressable>
          ) : null}
          {actions.map((a) => (
            <Pressable
              key={a.event}
              onPress={() => onTransition(a.event)}
              style={[
                styles.btn,
                a.primary
                  ? { backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm }
                  : { backgroundColor: theme.colors.background, borderRadius: theme.radius.sm },
              ]}
            >
              <Text
                style={{
                  color: a.primary ? theme.colors.primaryText : theme.colors.textMuted,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {t(`enquiryInbox.actions.${a.key}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 12, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  intent: { fontSize: 15, fontWeight: '700', flex: 1, paddingRight: 8 },
  message: { fontSize: 13, lineHeight: 19 },
  contact: { fontSize: 12 },
  order: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  btn: { paddingHorizontal: 14, paddingVertical: 9 },
});
