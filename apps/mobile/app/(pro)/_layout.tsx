import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ProLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('pro.title', { defaultValue: 'Assignments' }) }} />
      <Stack.Screen
        name="[assignmentId]"
        options={{ title: t('pro.detail', { defaultValue: 'Assignment' }) }}
      />
    </Stack>
  );
}
