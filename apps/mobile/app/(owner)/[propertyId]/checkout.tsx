import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { formatEuroCents, type Mandate, type Order } from '@easycasa/api-client';
import {
  useCreateMandate,
  useCreateOrder,
  useRequestSignature,
} from '../../../src/api/owner-tx-hooks';
import {
  useCreateIntent,
  useInvoicePreview,
  usePaymentIntent,
} from '../../../src/api/billing';
import { confirmPayment } from '../../../src/payments/confirm';
import { MandateStatusCard } from '../../../src/components/owner/MandateStatusCard';
import { PaymentSummary } from '../../../src/components/owner/PaymentSummary';
import { config } from '../../../src/config';
import { useTheme } from '../../../src/theme/useTheme';

type Theme = ReturnType<typeof useTheme>;

type Selection = {
  items?: string[];
  packageCode?: string;
  referenceValueCents?: number;
};

export default function CheckoutScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ propertyId: string; selection?: string }>();
  const pid = params.propertyId ?? '';

  const selection = useMemo((): Selection => {
    try {
      return params.selection ? (JSON.parse(params.selection) as Selection) : {};
    } catch {
      return {};
    }
  }, [params.selection]);

  const createOrder = useCreateOrder(pid);
  const createMandate = useCreateMandate();
  const requestSignature = useRequestSignature();
  const createIntent = useCreateIntent();

  const [order, setOrder] = useState<Order | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [exclusive, setExclusive] = useState(true);

  const preview = useInvoicePreview(order?.id ?? null);
  const intent = usePaymentIntent(intentId);
  const nothingDue = order != null && order.dueNowGrossCents <= 0;
  const paid = nothingDue || intent.data?.status === 'SUCCEEDED';

  // Step 1 — create the order (unlocks the fattura preview).
  const onCreateOrder = async () => {
    try {
      const o = await createOrder.mutateAsync(selection);
      setOrder(o);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    }
  };

  // Step 2 — pay the fattura total; the issued fattura follows on webhook success.
  const onPay = async () => {
    if (!order || !preview.data) return;
    try {
      setPaying(true);
      const amountCents = preview.data.totaleDocumentoCents;
      const { intentId: id, clientSecret } = await createIntent.mutateAsync({
        orderId: order.id,
        purpose: 'DUE_NOW',
        amountCents,
      });
      setIntentId(id);
      const result = await confirmPayment(clientSecret);
      if (result.status === 'failed') {
        Alert.alert(t('common.error'), result.error ?? t('payment.failed'));
      }
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    } finally {
      setPaying(false);
    }
  };

  // Step 3 — mandate + e-signature, once paid.
  const onMandate = async () => {
    if (!order) return;
    try {
      const m = await createMandate.mutateAsync({
        orderId: order.id,
        exclusive,
        durationMonths: 6,
      });
      setMandate(m);
      if (m.reviewRequiredItems.length === 0 && m.types.length >= 1) {
        const documentUrl = `${config.webAppUrl || 'https://easycasaita.com'}/mandates/${m.id}.pdf`;
        const { signingUrl } = await requestSignature.mutateAsync({
          mandateId: m.id,
          signerEmail: 'owner@easycasaita.com',
          documentUrl,
        });
        await Linking.openURL(signingUrl);
      }
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>{t('owner.checkout.title')}</Text>

      {!order ? (
        <>
          <Text style={[styles.muted, { color: theme.colors.textMuted }]}>
            {t('owner.checkout.intro')}
          </Text>
          <Cta
            label={t('owner.checkout.accept')}
            busy={createOrder.isPending}
            onPress={() => void onCreateOrder()}
            theme={theme}
          />
        </>
      ) : null}

      {order ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.line, { color: theme.colors.text }]}>
            {t('owner.checkout.dueNow')}: {formatEuroCents(order.dueNowGrossCents)}
          </Text>
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>
            {t('owner.checkout.estimatedTotal')}: {formatEuroCents(order.estimatedTotalGrossCents)}
          </Text>
        </View>
      ) : null}

      {/* Payment step: show the fattura total, then pay. */}
      {order && !paid ? (
        preview.isLoading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={theme.colors.primary} />
        ) : preview.data ? (
          <>
            <PaymentSummary fattura={preview.data} />
            <Cta
              label={t('payment.pay', {
                amount: formatEuroCents(preview.data.totaleDocumentoCents),
              })}
              busy={paying || createIntent.isPending || intent.isFetching}
              onPress={() => void onPay()}
              theme={theme}
            />
            {intent.data && intent.data.status !== 'SUCCEEDED' ? (
              <Text style={[styles.status, { color: theme.colors.textMuted }]}>
                {t('payment.processing')}
              </Text>
            ) : null}
          </>
        ) : preview.isError ? (
          <Text style={[styles.status, { color: theme.colors.danger }]}>
            {preview.error instanceof Error ? preview.error.message : t('common.error')}
          </Text>
        ) : null
      ) : null}

      {paid ? (
        <Text style={[styles.paid, { color: theme.colors.primary }]}>{t('payment.paid')}</Text>
      ) : null}

      {/* Mandate step: only after payment. */}
      {paid && !mandate ? (
        <>
          <View style={styles.toggle}>
            <Text style={{ color: theme.colors.text, fontSize: 14 }}>
              {t('owner.checkout.exclusive')}
            </Text>
            <Switch
              value={exclusive}
              onValueChange={setExclusive}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>
          <Cta
            label={t('owner.checkout.mandate')}
            busy={createMandate.isPending || requestSignature.isPending}
            onPress={() => void onMandate()}
            theme={theme}
          />
        </>
      ) : null}

      {mandate ? <MandateStatusCard mandate={mandate} /> : null}
      {requestSignature.isSuccess ? (
        <Text style={[styles.status, { color: theme.colors.primary }]}>
          {t('owner.checkout.signingOpened')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Cta({
  label,
  busy,
  onPress,
  theme,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.cta, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
    >
      {busy ? (
        <ActivityIndicator color={theme.colors.primaryText} />
      ) : (
        <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  muted: { fontSize: 14, marginBottom: 8 },
  card: { padding: 14, gap: 4, marginTop: 8 },
  line: { fontSize: 14, fontWeight: '600' },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cta: { paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  status: { fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  paid: { fontSize: 15, fontWeight: '700', marginTop: 16, textAlign: 'center' },
});
