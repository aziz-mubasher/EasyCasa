import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Mandate, Order, QuoteRequest } from '@easycasa/api-client';

import { useCatalog, usePackages, useQuote } from '../../../src/api/owner-hooks';
import { useTransactionsApi } from '../../../src/api/transactions';
import { PackageCard } from '../../../src/components/owner/PackageCard';
import { ServiceItemRow } from '../../../src/components/owner/ServiceItemRow';
import { QuoteSummary } from '../../../src/components/owner/QuoteSummary';
import { useTheme } from '../../../src/theme/useTheme';
import { config } from '../../../src/config';

export default function ServicesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const tx = useTransactionsApi();

  const { data: catalog, isLoading: loadingCatalog } = useCatalog();
  const { data: packages, isLoading: loadingPackages } = usePackages();
  const quote = useQuote();

  const [packageCode, setPackageCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const coveredByPackage = useMemo(() => {
    const pkg = packages?.find((p) => p.code === packageCode);
    return new Set(pkg?.includes ?? []);
  }, [packages, packageCode]);

  const selectPackage = (code: string) => {
    setPackageCode((prev) => (prev === code ? null : code));
  };

  const toggleItem = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const buildRequest = (): QuoteRequest => {
    const items = [...selected].filter((c) => !coveredByPackage.has(c));
    return {
      ...(packageCode ? { packageCode } : {}),
      ...(items.length ? { items } : {}),
    };
  };

  const requestQuote = () => {
    setMandate(null);
    setOrder(null);
    setAcceptError(null);
    quote.mutate(buildRequest());
  };

  const acceptQuote = async () => {
    if (!propertyId || !quote.data) return;
    setAcceptBusy(true);
    setAcceptError(null);
    try {
      const created = await tx.createOrder(propertyId, buildRequest());
      setOrder(created);
      const m = await tx.createMandate({
        orderId: created.id,
        exclusive: false,
        durationMonths: 12,
      });
      setMandate(m);

      if (m.reviewRequiredItems.length === 0 && m.types.length >= 1) {
        const documentUrl = `${config.webAppUrl || 'https://easycasaita.com'}/mandates/${m.id}.pdf`;
        const { signingUrl } = await tx.requestSignature(m.id, {
          signerEmail: 'owner@easycasaita.com',
          documentUrl,
        });
        await Linking.openURL(signingUrl);
      }
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setAcceptBusy(false);
    }
  };

  if (loadingCatalog || loadingPackages) {
    return <ActivityIndicator style={styles.center} color={theme.colors.primary} />;
  }

  const canQuote = packageCode !== null || selected.size > 0;
  const awaitingReview =
    mandate != null &&
    (mandate.reviewRequiredItems.length > 0 || mandate.types.length === 0);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.section, { color: theme.colors.textMuted }]}>
        {t('owner.services.packagesHeading')}
      </Text>
      {(packages ?? []).map((pkg) => (
        <PackageCard
          key={pkg.code}
          pkg={pkg}
          selected={packageCode === pkg.code}
          onSelect={selectPackage}
        />
      ))}

      <Text style={[styles.section, { color: theme.colors.textMuted }]}>
        {t('owner.services.alaCarteHeading')}
      </Text>
      {(catalog ?? []).map((item) => {
        const covered = coveredByPackage.has(item.code);
        return (
          <View key={item.code} style={covered ? styles.covered : undefined}>
            <ServiceItemRow
              item={item}
              selected={covered || selected.has(item.code)}
              onToggle={covered ? () => undefined : toggleItem}
            />
            {covered ? (
              <Text style={[styles.coveredTag, { color: theme.colors.textMuted }]}>
                {t('owner.services.coveredByPackage')}
              </Text>
            ) : null}
          </View>
        );
      })}

      <Pressable
        onPress={requestQuote}
        disabled={!canQuote || quote.isPending}
        style={[
          styles.cta,
          {
            backgroundColor: canQuote ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        {quote.isPending ? (
          <ActivityIndicator color={theme.colors.primaryText} />
        ) : (
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>
            {t('owner.services.getQuote')}
          </Text>
        )}
      </Pressable>

      {quote.isError ? (
        <Text style={[styles.err, { color: theme.colors.danger }]}>
          {quote.error instanceof Error ? quote.error.message : t('common.error')}
        </Text>
      ) : null}

      {quote.data ? (
        <View style={styles.quoteBlock}>
          <Text style={[styles.section, { color: theme.colors.textMuted }]}>
            {t('owner.services.quoteHeading')}
          </Text>
          <QuoteSummary quote={quote.data} />

          <Pressable
            onPress={() => void acceptQuote()}
            disabled={acceptBusy}
            style={[
              styles.cta,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.md,
                marginTop: 12,
              },
            ]}
          >
            {acceptBusy ? (
              <ActivityIndicator color={theme.colors.primaryText} />
            ) : (
              <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>
                {t('owner.services.acceptQuote')}
              </Text>
            )}
          </Pressable>

          {acceptError ? (
            <Text style={[styles.err, { color: theme.colors.danger }]}>{acceptError}</Text>
          ) : null}

          {order ? (
            <Text style={[styles.note, { color: theme.colors.textMuted }]}>
              {t('owner.services.orderCreated', { id: order.id.slice(0, 8) })}
            </Text>
          ) : null}

          {awaitingReview ? (
            <Text style={[styles.review, { color: theme.colors.danger }]}>
              {t('owner.services.awaitingLegalReview')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  section: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  covered: { opacity: 0.6 },
  coveredTag: { fontSize: 11, marginTop: -4, marginBottom: 8, marginLeft: 12, fontStyle: 'italic' },
  cta: { paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  err: { marginTop: 12, fontSize: 13 },
  note: { marginTop: 8, fontSize: 12 },
  review: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  quoteBlock: { marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64 },
});
