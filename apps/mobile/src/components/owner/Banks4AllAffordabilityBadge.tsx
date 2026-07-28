import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Enquiry } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

/** YYYY-MM-DD in Europe/Rome — must match API `isBanks4AllBadgeVisible`. */
function calendarDateInRome(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isBadgeVisible(enquiry: Enquiry, now = new Date()): boolean {
  const band = enquiry.b4aBandMaxCents;
  const expires = enquiry.b4aExpiresAt;
  if (band == null || !expires) return false;
  return expires >= calendarDateInRome(now);
}

function formatBand(cents: number, locale: string): string {
  const euros = Math.round(cents / 100);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(euros);
  } catch {
    return `€${euros.toLocaleString('it-IT')}`;
  }
}

/** Owner-facing Banks4All affordability badge — EC-1 / EC-3. Absence renders nothing. */
export function Banks4AllAffordabilityBadge({ enquiry }: { enquiry: Enquiry }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  if (!isBadgeVisible(enquiry)) return null;

  const band = formatBand(enquiry.b4aBandMaxCents!, i18n.language || 'it');
  const expires = enquiry.b4aExpiresAt!;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
      ]}
      accessibilityRole="text"
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t('enquiryInbox.b4a.title')}
      </Text>
      <Text style={[styles.meta, { color: theme.colors.text }]}>
        {t('enquiryInbox.b4a.range', { band, expires })}
      </Text>
      <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>
        {t('enquiryInbox.b4a.disclaimer')}
      </Text>
      <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>
        {t('enquiryInbox.b4a.group')}
      </Text>
    </View>
  );
}

/** Exported for unit tests (cents ÷ 100). */
export const __test = { formatBand, isBadgeVisible, calendarDateInRome };

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  title: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 12, fontWeight: '600' },
  disclaimer: { fontSize: 11, lineHeight: 15 },
});
