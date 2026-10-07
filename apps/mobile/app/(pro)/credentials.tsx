import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ProCredential } from '@easycasa/api-client';
import { useMyProfile, useSubmitCredential } from '../../src/api/professional-hooks';
import {
  ACCEPTED_CREDENTIAL_TYPES,
  isAcceptedCredentialType,
} from '../../src/pro/assignment-filter';
import { CredentialRow } from '../../src/components/pro/CredentialRow';
import { useTheme } from '../../src/theme/useTheme';

export default function ProCredentials() {
  const theme = useTheme();
  const { t } = useTranslation();
  const profile = useMyProfile();
  const submit = useSubmitCredential(profile.data?.id ?? '');

  const [type, setType] = useState<ProCredential['type']>(ACCEPTED_CREDENTIAL_TYPES[0] ?? 'ALBO_TECNICO');
  const [reference, setReference] = useState('');

  if (profile.isLoading) return <ActivityIndicator style={styles.center} color={theme.colors.primary} />;
  if (profile.isError || !profile.data) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.danger }}>{t('common.error')}</Text>
      </View>
    );
  }

  const onSubmit = () => {
    if (!isAcceptedCredentialType(type)) return;
    submit.mutate({ type, ...(reference ? { reference } : {}) });
    setReference('');
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.section, { color: theme.colors.textMuted }]}>{t('pro.creds.yours')}</Text>
      {profile.data.credentials.filter((c) => isAcceptedCredentialType(c.type)).length === 0 ? (
        <Text style={[styles.muted, { color: theme.colors.textMuted }]}>{t('pro.creds.none')}</Text>
      ) : (
        profile.data.credentials
          .filter((c) => isAcceptedCredentialType(c.type))
          .map((c) => <CredentialRow key={c.type} credential={c} />)
      )}

      <Text style={[styles.section, { color: theme.colors.textMuted }]}>{t('pro.creds.add')}</Text>
      <View style={styles.chips}>
        {ACCEPTED_CREDENTIAL_TYPES.map((tp) => {
          const active = tp === type;
          return (
            <Pressable
              key={tp}
              onPress={() => setType(tp)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderRadius: theme.radius.sm,
                },
              ]}
            >
              <Text style={{ color: active ? theme.colors.primaryText : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                {tp}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={reference}
        onChangeText={setReference}
        placeholder={t('pro.creds.reference')}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md }]}
      />
      <Pressable
        onPress={onSubmit}
        disabled={submit.isPending}
        style={[styles.submit, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
      >
        {submit.isPending ? (
          <ActivityIndicator color={theme.colors.primaryText} />
        ) : (
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('pro.creds.submit')}</Text>
        )}
      </Pressable>
      <Text style={[styles.note, { color: theme.colors.textMuted }]}>{t('pro.creds.note')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  section: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  muted: { fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8 },
  input: { height: 48, paddingHorizontal: 16, fontSize: 15, marginBottom: 12 },
  submit: { paddingVertical: 16, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64 },
  note: { fontSize: 12, marginTop: 12, fontStyle: 'italic' },
});
