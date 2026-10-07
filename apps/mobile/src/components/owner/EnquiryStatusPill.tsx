import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { EnquiryStatus } from '@easycasa/api-client';
import { presentedEnquiryStatus, type PresentedEnquiryStatus } from '../../enquiries/present';

const COLORS: Record<PresentedEnquiryStatus, string> = {
  NEW: '#3b82f6',
  CONTACTED: '#f59e0b',
  CLOSED: '#6b7280',
};

export function EnquiryStatusPill({ status }: { status: EnquiryStatus }) {
  const { t } = useTranslation();
  const presented = presentedEnquiryStatus(status);
  const color = COLORS[presented];
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{t(`enquiryInbox.status.${presented}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
