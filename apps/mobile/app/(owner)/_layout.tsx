import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OwnerApiProvider } from '../../src/api/owner';
import { TransactionsApiProvider } from '../../src/api/transactions';

export default function OwnerLayout() {
  const { t } = useTranslation();
  return (
    <OwnerApiProvider>
      <TransactionsApiProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: t('owner.title') }} />
          <Stack.Screen name="[propertyId]/fascicolo" options={{ title: t('owner.fascicolo.title') }} />
          <Stack.Screen name="[propertyId]/services" options={{ title: t('owner.services.title') }} />
        </Stack>
      </TransactionsApiProvider>
    </OwnerApiProvider>
  );
}
