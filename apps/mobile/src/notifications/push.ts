import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';

import type { EasyCasaClient } from '@easycasa/api-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests permission, obtains an Expo push token, and registers the device so
 * the backend can deliver saved-search alerts. Web has no native push here, so
 * this is a no-op there (a service-worker web-push path can be added later).
 *
 * Returns the token on success, or null if unavailable / denied.
 */
export async function registerForPush(api: EasyCasaClient): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResponse.data;

  await api.registerDevice({
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    locale: getLocales()[0]?.languageCode ?? 'en',
  });

  return token;
}
