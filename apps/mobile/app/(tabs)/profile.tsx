import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../src/auth/AuthProvider';
import { useApi } from '../../src/api/client';
import { registerForPush } from '../../src/notifications/push';
import { setLocale, SUPPORTED_LOCALES, type SupportedLocale } from '../../src/i18n';
import { useTheme } from '../../src/theme/useTheme';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, signIn, signOut } = useAuth();
  const api = useApi();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top + 16 }]}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('profile.language')}</Text>
      <View style={styles.row}>
        {SUPPORTED_LOCALES.map((loc: SupportedLocale) => {
          const active = i18n.language === loc;
          return (
            <Pressable
              key={loc}
              onPress={() => void setLocale(loc)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderRadius: theme.radius.sm,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.colors.primaryText : theme.colors.text,
                  fontWeight: '600',
                }}
              >
                {loc.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/(owner)')}
        style={[styles.action, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{t('owner.title')}</Text>
      </Pressable>

      {isAuthenticated ? (
        <>
          <Pressable
            onPress={() => void registerForPush(api)}
            style={[styles.action, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
          >
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
              {t('profile.notifications')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void signOut()}
            style={[styles.action, { borderRadius: theme.radius.md, borderColor: theme.colors.border, borderWidth: 1 }]}
          >
            <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{t('auth.signOut')}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={() => void signIn()}
          style={[styles.action, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
        >
          <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('auth.signIn')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, gap: 12 },
  label: { fontSize: 13, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8 },
  action: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
});
