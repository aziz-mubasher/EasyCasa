import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OwnerApiProvider } from '../../src/api/owner';
import { RentalsApiProvider } from '../../src/api/rentals';
import { TransactionsApiProvider } from '../../src/api/transactions';
import { BillingProvider } from '../../src/api/billing';

export default function OwnerLayout() {
  const { t } = useTranslation();
  return (
    <OwnerApiProvider>
      <TransactionsApiProvider>
        <BillingProvider>
          <RentalsApiProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="enquiries" />
              <Stack.Screen name="visits" />
              <Stack.Screen name="visit/[id]" />
              <Stack.Screen name="documents" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="rule" />
              <Stack.Screen name="checkup" />
              <Stack.Screen name="receipt" />
              <Stack.Screen name="publish/[step]" />
              <Stack.Screen name="valuation" options={{ headerShown: true, title: t('valuation.title') }} />
              <Stack.Screen name="[propertyId]/fascicolo" options={{ headerShown: true, title: t('owner.fascicolo.title') }} />
              <Stack.Screen name="[propertyId]/services" options={{ headerShown: true, title: t('owner.services.title') }} />
              <Stack.Screen name="[propertyId]/checkout" options={{ headerShown: true, title: t('owner.checkout.title') }} />
              <Stack.Screen name="[propertyId]/lease" options={{ headerShown: true, title: t('owner.lease.title') }} />
            </Stack>
          </RentalsApiProvider>
        </BillingProvider>
      </TransactionsApiProvider>
    </OwnerApiProvider>
  );
}
