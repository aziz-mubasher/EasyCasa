import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

/** A cluster bubble; grows with the count so dense areas read at a glance. */
export function ClusterMarker({ count }: { count: number }) {
  const theme = useTheme();
  const size = count === 1 ? 34 : Math.min(34 + Math.log10(count) * 18, 64);
  return (
    <View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primaryText,
        },
      ]}
    >
      <Text style={[styles.label, { color: theme.colors.primaryText }]}>{count === 1 ? '•' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  label: { fontWeight: '800', fontSize: 12 },
});
