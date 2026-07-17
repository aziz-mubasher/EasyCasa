import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useFascicolo, useAddDocument } from '../../../src/api/owner-hooks';
import { pickAndUploadDocument } from '../../../src/api/upload';
import { useAuth } from '../../../src/auth/AuthProvider';
import { GateBanner } from '../../../src/components/owner/GateBanner';
import { DocumentChecklistRow } from '../../../src/components/owner/DocumentChecklistRow';
import { useTheme } from '../../../src/theme/useTheme';

export default function FascicoloScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAccessToken } = useAuth();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const id = propertyId ?? '';

  const { data, isLoading, isError } = useFascicolo(id);
  const addDocument = useAddDocument(id);
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);

  const onUpload = async (code: string) => {
    try {
      setUploadingCode(code);
      const uploaded = await pickAndUploadDocument(getAccessToken);
      if (!uploaded) return; // cancelled
      await addDocument.mutateAsync({ code, url: uploaded.url });
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingCode(null);
    }
  };

  if (isLoading) return <ActivityIndicator style={styles.center} color={theme.colors.primary} />;
  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.danger }}>{t('common.error')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.section, { color: theme.colors.textMuted }]}>
        {t('owner.fascicolo.gatesHeading')}
      </Text>
      <GateBanner gates={data.gates} />

      <Text style={[styles.section, { color: theme.colors.textMuted }]}>
        {t('owner.fascicolo.docsHeading')}
      </Text>
      {data.checklist.map((entry) => (
        <DocumentChecklistRow
          key={entry.code}
          entry={entry}
          uploading={uploadingCode === entry.code}
          onUpload={onUpload}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  section: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64 },
});
