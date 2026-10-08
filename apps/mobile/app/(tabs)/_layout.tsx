import React from 'react';
import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../src/theme/useTheme';

function TabIcon({ name, focused }: { name: 'search' | 'saved' | 'profile'; focused: boolean }) {
  const theme = useTheme();
  const color = focused ? theme.colors.primary : theme.colors.textMuted;
  const glyph = name === 'search' ? '⌕' : name === 'saved' ? '♡' : '☺';
  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingVertical: 4,
        borderRadius: 16,
        backgroundColor: focused ? theme.colors.tabActiveBg : 'transparent',
      }}
    >
      <Text style={{ fontSize: 20, color, lineHeight: 24, textAlign: 'center' }}>{glyph}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: theme.font.displayMed,
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: 'rgba(251,248,241,0.95)',
          borderTopColor: 'rgba(20,33,46,0.10)',
          height: 84,
          paddingTop: 8,
          paddingBottom: 26,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.saved'),
          tabBarIcon: ({ focused }) => <TabIcon name="saved" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
      <Tabs.Screen name="map" options={{ href: null }} />
    </Tabs>
  );
}
