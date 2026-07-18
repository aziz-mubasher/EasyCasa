import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OwnerApiProvider } from '../../src/api/owner';
import { RentalsApiProvider } from '../../src/api/rentals';
import { TransactionsApiProvider } from '../../src/api/transactions';

export default function OwnerLayout() {
  const { t } = useTranslation();
  return (
    <OwnerApiProvider>
      <TransactionsApiProvider>
        <RentalsApiProvider>
          <Stack>
            <Stack.Screen name="index" options={{ title: t('owner.title') }} />
            <Stack.Screen name="[propertyId]/fascicolo" options={{ title: t('owner.fascicolo.title') }} />
            <Stack.Screen name="[propertyId]/services" options={{ title: t('owner.services.title') }} />
            <Stack.Screen name="[propertyId]/lease" options={{ title: t('owner.lease.title') }} />
          </Stack>
        </RentalsApiProvider>
      </TransactionsApiProvider>
    </OwnerApiProvider>
  );
}
