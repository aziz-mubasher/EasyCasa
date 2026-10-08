import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/auth/AuthProvider';
import { ApiProvider } from '../src/api/client';
import { DiscoveryProvider } from '../src/api/discovery';
import { useAppFonts } from '../src/theme/fonts';
import { useTheme } from '../src/theme/useTheme';
import '../src/i18n';

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const theme = useTheme();

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ApiProvider>
          <DiscoveryProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(welcome)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(search)" />
              <Stack.Screen name="(owner)" options={{ headerShown: false }} />
              <Stack.Screen name="(pro)" options={{ headerShown: false }} />
              <Stack.Screen name="listing/[slug]" options={{ headerShown: true, title: '' }} />
              <Stack.Screen name="booking/[listingId]" options={{ headerShown: true, title: '' }} />
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
