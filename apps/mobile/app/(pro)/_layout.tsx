import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProApiProvider } from '../../src/api/professional';

export default function ProLayout() {
  const { t } = useTranslation();
  return (
    <ProApiProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: t('pro.inbox.title') }} />
        <Stack.Screen name="[assignmentId]" options={{ title: t('pro.detail.title') }} />
        <Stack.Screen name="credentials" options={{ title: t('pro.creds.title') }} />
      </Stack>
    </ProApiProvider>
  );
}
