import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { EnquiryStatus } from '@easycasa/api-client';

const COLORS: Record<EnquiryStatus, string> = {
  NEW: '#3b82f6',
  CONTACTED: '#f59e0b',
  QUALIFIED: '#3bc9a8',
  CONVERTED: '#22a559',
  CLOSED: '#6b7280',
};

export function EnquiryStatusPill({ status }: { status: EnquiryStatus }) {
  const { t } = useTranslation();
  const color = COLORS[status];
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{t(`enquiryInbox.status.${status}`)}</Text>
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
