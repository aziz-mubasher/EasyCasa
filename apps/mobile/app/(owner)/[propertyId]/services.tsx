import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { QuoteRequest } from '@easycasa/api-client';

import { useCatalog, usePackages, useQuote } from '../../../src/api/owner-hooks';
import { PackageCard } from '../../../src/components/owner/PackageCard';
import { ServiceItemRow } from '../../../src/components/owner/ServiceItemRow';
import { QuoteSummary } from '../../../src/components/owner/QuoteSummary';
import { useTheme } from '../../../src/theme/useTheme';

export default function ServicesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();

  const { data: catalog, isLoading: loadingCatalog } = useCatalog();
  const { data: packages, isLoading: loadingPackages } = usePackages();
  const quote = useQuote();

  const [packageCode, setPackageCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    quote.mutate(buildRequest());
  };

  const goCheckout = () => {
    if (!propertyId || !quote.data) return;
    router.push({
      pathname: '/(owner)/[propertyId]/checkout',
      params: {
        propertyId,
        selection: JSON.stringify(buildRequest()),
      },
    });
  };

  if (loadingCatalog || loadingPackages) {
    return <ActivityIndicator style={styles.center} color={theme.colors.primary} />;
  }

  const canQuote = packageCode !== null || selected.size > 0;

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
            onPress={goCheckout}
            style={[
              styles.cta,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.md,
                marginTop: 12,
              },
            ]}
          >
            <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>
              {t('owner.services.acceptQuote')}
            </Text>
          </Pressable>
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
  quoteBlock: { marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64 },
});
