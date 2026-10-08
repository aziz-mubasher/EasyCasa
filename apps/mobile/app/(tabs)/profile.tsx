import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileBody } from '../../src/components/profile/ProfileBody';
import { useTheme } from '../../src/theme/useTheme';

/** Frames 17 and 13 — guest card or signed-in account, including Esci. */
export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 40 }}
    >
      <ProfileBody shell="seeker" />
    </ScrollView>
  );
}
