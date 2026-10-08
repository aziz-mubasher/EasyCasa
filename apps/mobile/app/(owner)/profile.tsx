import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileBody } from '../../src/components/profile/ProfileBody';
import { OwnerTabBar } from '../../src/components/shell/OwnerTabBar';
import { useTheme } from '../../src/theme/useTheme';

/** Frame 13 inside the seller shell. */
export default function SellerProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 24 }}>
        <ProfileBody shell="seller" />
      </ScrollView>
      <OwnerTabBar active="profile" />
    </View>
  );
}
