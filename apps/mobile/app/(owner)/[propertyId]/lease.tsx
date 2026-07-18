import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  type Lease,
  type LeaseInput,
  type LeaseType,
  type LeaseValidation,
  type RliPayload,
} from '@easycasa/api-client';

import { useRentalsApi } from '../../../src/api/rentals';
import { LeaseTaxSummary } from '../../../src/components/owner/LeaseTaxSummary';
import { useTheme } from '../../../src/theme/useTheme';

const LEASE_TYPES: LeaseType[] = ['LIBERO_4_4', 'CONCORDATO_3_2', 'TRANSITORIO', 'STUDENTI'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultDuration(type: LeaseType): number {
  switch (type) {
    case 'LIBERO_4_4':
      return 48;
    case 'CONCORDATO_3_2':
      return 36;
    case 'TRANSITORIO':
      return 12;
    case 'STUDENTI':
      return 12;
  }
}

export default function LeaseScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const api = useRentalsApi();

  const [type, setType] = useState<LeaseType>('LIBERO_4_4');
  const [startAt, setStartAt] = useState(todayIso());
  const [durationMonths, setDurationMonths] = useState('48');
  const [annualRentEuro, setAnnualRentEuro] = useState('12000');
  const [cedolareSecca, setCedolareSecca] = useState(true);
  const [highTension, setHighTension] = useState(false);
  const [apeAttached, setApeAttached] = useState(false);

  const [preview, setPreview] = useState<LeaseValidation | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [lease, setLease] = useState<Lease | null>(null);
  const [rli, setRli] = useState<RliPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input: LeaseInput | null = useMemo(() => {
    const months = Number.parseInt(durationMonths, 10);
    const euros = Number.parseFloat(annualRentEuro.replace(',', '.'));
    if (!Number.isFinite(months) || months < 1) return null;
    if (!Number.isFinite(euros) || euros < 0) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startAt)) return null;
    return {
      type,
      startAt,
      durationMonths: months,
      annualRentCents: Math.round(euros * 100),
      cedolareSecca,
      highTension,
      apeAttached,
      signedAt: startAt,
    };
  }, [type, startAt, durationMonths, annualRentEuro, cedolareSecca, highTension, apeAttached]);

  useEffect(() => {
    if (!input) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewBusy(true);
    void api
      .previewLease(input)
      .then((v) => {
        if (!cancelled) setPreview(v);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, input]);

  const selectType = (next: LeaseType) => {
    setType(next);
    setDurationMonths(String(defaultDuration(next)));
    setLease(null);
    setRli(null);
  };

  const createAndLoadRli = async () => {
    if (!propertyId || !input || !preview?.valid) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.createLease(propertyId, input);
      setLease(created);
      const payload = await api.getRliPayload(created.id);
      setRli(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    if (!lease) return;
    setBusy(true);
    setError(null);
    try {
      const registered = await api.registerLease(lease.id);
      setLease(registered);
      const payload = await api.getRliPayload(registered.id);
      setRli(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const cedolareLabel =
    preview == null
      ? '—'
      : preview.cedolareRate === 0
        ? t('owner.lease.cedolareNone')
        : `${(preview.cedolareRate * 100).toFixed(0)}%`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.heading, { color: theme.colors.text }]}>
        {t('owner.lease.formHeading')}
      </Text>

      <Text style={[styles.label, { color: theme.colors.textMuted }]}>
        {t('owner.lease.type')}
      </Text>
      <View style={styles.typeRow}>
        {LEASE_TYPES.map((lt) => {
          const active = lt === type;
          return (
            <Pressable
              key={lt}
              onPress={() => selectType(lt)}
              style={[
                styles.typeChip,
                {
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  backgroundColor: active ? theme.colors.surface : 'transparent',
                  borderRadius: theme.radius.sm,
                },
              ]}
            >
              <Text style={{ color: active ? theme.colors.primary : theme.colors.text, fontSize: 12 }}>
                {t(`owner.lease.types.${lt}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Field
        label={t('owner.lease.startAt')}
        value={startAt}
        onChangeText={setStartAt}
        placeholder="YYYY-MM-DD"
        theme={theme}
      />
      <Field
        label={t('owner.lease.durationMonths')}
        value={durationMonths}
        onChangeText={setDurationMonths}
        keyboardType="number-pad"
        theme={theme}
      />
      <Field
        label={t('owner.lease.annualRent')}
        value={annualRentEuro}
        onChangeText={setAnnualRentEuro}
        keyboardType="decimal-pad"
        theme={theme}
      />

      <Toggle
        label={t('owner.lease.cedolare')}
        value={cedolareSecca}
        onValueChange={setCedolareSecca}
        theme={theme}
      />
      <Toggle
        label={t('owner.lease.highTension')}
        value={highTension}
        onValueChange={setHighTension}
        theme={theme}
      />
      <Toggle
        label={t('owner.lease.apeAttached')}
        value={apeAttached}
        onValueChange={setApeAttached}
        theme={theme}
      />

      <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
        <Text style={[styles.panelTitle, { color: theme.colors.text }]}>
          {t('owner.lease.previewHeading')}
          {previewBusy ? '…' : ''}
        </Text>
        {preview ? (
          <>
            <Text style={{ color: theme.colors.text }}>
              {t('owner.lease.cedolareRate')}: {cedolareLabel}
            </Text>
            <Text
              style={{
                color: preview.valid ? theme.colors.primary : theme.colors.danger,
                fontWeight: '600',
                marginTop: 4,
              }}
            >
              {preview.valid ? t('owner.lease.valid') : t('owner.lease.invalid')}
            </Text>
            {preview.blockers.map((b) => (
              <Text key={b.code} style={{ color: theme.colors.danger, marginTop: 4, fontSize: 13 }}>
                • {b.messageIt || b.messageEn}
              </Text>
            ))}
            {preview.warnings.map((w) => (
              <Text key={w.code} style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: 13 }}>
                • {w.messageIt || w.messageEn}
              </Text>
            ))}
          </>
        ) : (
          <Text style={{ color: theme.colors.textMuted }}>{t('owner.lease.previewHint')}</Text>
        )}
      </View>

      <Pressable
        disabled={!preview?.valid || busy || !input}
        onPress={() => void createAndLoadRli()}
        style={[
          styles.cta,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.md,
            opacity: !preview?.valid || busy ? 0.5 : 1,
          },
        ]}
      >
        {busy && !lease ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>{t('owner.lease.create')}</Text>
        )}
      </Pressable>

      {rli ? <LeaseTaxSummary payload={rli} /> : null}

      {lease && !lease.registrationProtocollo ? (
        <Pressable
          disabled={busy}
          onPress={() => void register()}
          style={[
            styles.cta,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              opacity: busy ? 0.5 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{t('owner.lease.register')}</Text>
          )}
        </Pressable>
      ) : null}

      {lease?.registrationProtocollo ? (
        <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
          <Text style={[styles.panelTitle, { color: theme.colors.primary }]}>
            {t('owner.lease.registered')}
          </Text>
          <Text style={{ color: theme.colors.text }}>
            {t('owner.lease.protocollo')}: {lease.registrationProtocollo}
          </Text>
          {lease.registeredAt ? (
            <Text style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: 13 }}>
              {lease.registeredAt}
            </Text>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Text style={{ color: theme.colors.danger, marginTop: 8 }}>{error}</Text>
      ) : null}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  theme,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={[
          styles.input,
          {
            color: theme.colors.text,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.sm,
          },
        ]}
      />
    </View>
  );
}

function Toggle({
  label,
  value,
  onValueChange,
  theme,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={{ color: theme.colors.text, flex: 1 }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 48 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  field: { gap: 4 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  panel: { padding: 14, gap: 2, marginTop: 4 },
  panelTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cta: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
