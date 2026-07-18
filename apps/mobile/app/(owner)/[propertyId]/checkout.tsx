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
import { MandateStatusCard } from '../../../src/components/owner/MandateStatusCard';
import { config } from '../../../src/config';
import { useTheme } from '../../../src/theme/useTheme';

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

  const [order, setOrder] = useState<Order | null>(null);
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [exclusive, setExclusive] = useState(true);

  const onAccept = async () => {
    try {
      const o = await createOrder.mutateAsync(selection);
      setOrder(o);
      const m = await createMandate.mutateAsync({
        orderId: o.id,
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

  const busy = createOrder.isPending || createMandate.isPending || requestSignature.isPending;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>{t('owner.checkout.title')}</Text>

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
      ) : (
        <Text style={[styles.muted, { color: theme.colors.textMuted }]}>
          {t('owner.checkout.intro')}
        </Text>
      )}

      <View style={styles.toggle}>
        <Text style={{ color: theme.colors.text, fontSize: 14 }}>{t('owner.checkout.exclusive')}</Text>
        <Switch
          value={exclusive}
          onValueChange={setExclusive}
          trackColor={{ true: theme.colors.primary }}
        />
      </View>

      {mandate ? <MandateStatusCard mandate={mandate} /> : null}

      {requestSignature.isSuccess ? (
        <Text style={[styles.signing, { color: theme.colors.primary }]}>
          {t('owner.checkout.signingOpened')}
        </Text>
      ) : null}

      {!mandate ? (
        <Pressable
          onPress={() => void onAccept()}
          disabled={busy}
          style={[
            styles.cta,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.primaryText} />
          ) : (
            <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>
              {t('owner.checkout.accept')}
            </Text>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  muted: { fontSize: 14, marginBottom: 8 },
  card: { padding: 14, gap: 4, marginBottom: 8 },
  line: { fontSize: 14, fontWeight: '600' },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cta: { paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  signing: { fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },
});
