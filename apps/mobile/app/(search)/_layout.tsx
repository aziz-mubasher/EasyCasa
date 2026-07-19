import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SearchLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="saved"
        options={{ headerShown: true, title: t('discovery.savedLabel') }}
      />
    </Stack>
  );
}
