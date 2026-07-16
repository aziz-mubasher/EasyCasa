import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const onPress = async () => {
    await signIn();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{t('auth.signedOutTitle')}</Text>
      <Text style={[styles.body, { color: theme.colors.textMuted }]}>{t('auth.signedOutBody')}</Text>
      <Pressable
        onPress={onPress}
        style={[styles.cta, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
      >
        <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('auth.signIn')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center' },
  cta: { paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
});
