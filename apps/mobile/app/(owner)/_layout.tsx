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
            <Stack>
              <Stack.Screen name="index" options={{ title: t('owner.title') }} />
              <Stack.Screen name="enquiries" options={{ title: t('enquiryInbox.nav') }} />
              <Stack.Screen name="valuation" options={{ title: t('valuation.title') }} />
              <Stack.Screen name="[propertyId]/fascicolo" options={{ title: t('owner.fascicolo.title') }} />
              <Stack.Screen name="[propertyId]/services" options={{ title: t('owner.services.title') }} />
              <Stack.Screen name="[propertyId]/checkout" options={{ title: t('owner.checkout.title') }} />
              <Stack.Screen name="[propertyId]/lease" options={{ title: t('owner.lease.title') }} />
            </Stack>
          </RentalsApiProvider>
        </BillingProvider>
      </TransactionsApiProvider>
    </OwnerApiProvider>
  );
}
