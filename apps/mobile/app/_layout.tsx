import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/auth/AuthProvider';
import { ApiProvider } from '../src/api/client';
import { DiscoveryProvider } from '../src/api/discovery';
import '../src/i18n';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ApiProvider>
          <DiscoveryProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(search)" />
              <Stack.Screen name="(owner)" options={{ headerShown: false }} />
              <Stack.Screen name="(pro)" options={{ headerShown: false }} />
              <Stack.Screen name="listing/[slug]" options={{ headerShown: true, title: '' }} />
              <Stack.Screen
                name="(auth)/sign-in"
                options={{ presentation: 'modal', headerShown: true, title: '' }}
              />
            </Stack>
          </DiscoveryProvider>
        </ApiProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
