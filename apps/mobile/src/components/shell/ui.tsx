import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/useTheme';
import { NAV } from '../../flow/paths';

export function ScreenScroll({
  children,
  footer,
  tabPad,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  tabPad?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: (footer ? 120 : 28) + (tabPad ? 96 : 0) + insets.bottom,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: 'rgba(251,248,241,0.95)',
              borderTopColor: 'rgba(20,33,46,0.10)',
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function BackHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 8, borderBottomColor: 'rgba(20,33,46,0.12)' },
      ]}
    >
      <Pressable
        accessibilityLabel="Indietro"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(NAV.search)))}
        style={styles.back}
      >
        <Text style={{ fontSize: 22, color: theme.colors.text }}>‹</Text>
      </Pressable>
      <Text style={{ fontFamily: theme.font.display, fontSize: 18, color: theme.colors.text, flex: 1 }}>
        {title}
      </Text>
    </View>
  );
}

export function PriButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        { backgroundColor: disabled ? '#d6cfc2' : theme.colors.ink, borderRadius: theme.radius.md },
      ]}
    >
      <Text
        style={{
          fontFamily: theme.font.displaySemi,
          fontSize: 16,
          color: disabled ? '#6d7884' : theme.colors.inkText,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SecButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, { borderWidth: 1, borderColor: theme.colors.ink, borderRadius: theme.radius.md }]}
    >
      <Text style={{ fontFamily: theme.font.displaySemi, fontSize: 16, color: theme.colors.text }}>{label}</Text>
    </Pressable>
  );
}

export function H1({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={{ fontFamily: theme.font.display, fontSize: 28, letterSpacing: -0.4, color: theme.colors.text }}>
      {children}
    </Text>
  );
}

export function Body({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={{ fontFamily: theme.font.body, fontSize: 16, lineHeight: 23, color: theme.colors.textMuted }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  btn: { height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
});
