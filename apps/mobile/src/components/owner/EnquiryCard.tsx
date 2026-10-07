import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Enquiry, EnquiryEvent } from '@easycasa/api-client';
import {
  presentedEnquiryStatus,
  presentedIntentKey,
  type PresentedEnquiryStatus,
} from '../../enquiries/present';
import { Banks4AllAffordabilityBadge } from './Banks4AllAffordabilityBadge';
import { EnquiryStatusPill } from './EnquiryStatusPill';
import { useTheme } from '../../theme/useTheme';

interface Action {
  event: EnquiryEvent;
  key: string;
  primary?: boolean;
}

/** Seller actions: mark contacted, close, reopen. No merit step and no order conversion. */
const ACTIONS: Record<PresentedEnquiryStatus, Action[]> = {
  NEW: [
    { event: 'CONTACT', key: 'markContacted', primary: true },
    { event: 'CLOSE', key: 'close' },
  ],
  CONTACTED: [{ event: 'CLOSE', key: 'close' }],
  CLOSED: [{ event: 'REOPEN', key: 'reopen' }],
};

export function EnquiryCard({
  enquiry,
  busy,
  onTransition,
}: {
  enquiry: Enquiry;
  busy: boolean;
  onTransition: (event: EnquiryEvent) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const presented = presentedEnquiryStatus(enquiry.status);
  const actions = ACTIONS[presented];

  return (
    <View
      style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
    >
      <View style={styles.head}>
        <Text style={[styles.intent, { color: theme.colors.text }]}>
          {t(`enquiryInbox.intents.${presentedIntentKey(enquiry.intent)}`)}
        </Text>
        <EnquiryStatusPill status={enquiry.status} />
      </View>

      <Text style={[styles.message, { color: theme.colors.text }]} numberOfLines={3}>
        {enquiry.message}
      </Text>
      <Banks4AllAffordabilityBadge enquiry={enquiry} />

      {busy ? (
        <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} />
      ) : (
        <View style={styles.actions}>
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  btn: { paddingHorizontal: 14, paddingVertical: 9 },
});
