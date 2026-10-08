import React, { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useFlow } from '../src/flow/FlowProvider';
import { NAV } from '../src/flow/paths';
import { useTheme } from '../src/theme/useTheme';

const mark = require('../assets/brand/easycasa-italia-mark.png');

/** Frame 00b — 1.2s, then welcome, or the last role's shell. */
export default function SplashScreen() {
  const theme = useTheme();
  const router = useRouter();
  const flow = useFlow();

  useEffect(() => {
    if (!flow.ready) return;
    const timer = setTimeout(() => {
      if (!flow.state.welcomeSeen || !flow.role) {
        router.replace(NAV.welcome);
        return;
      }
      router.replace(flow.role === 'seller' ? NAV.seller : NAV.search);
    }, 1200);
    return () => clearTimeout(timer);
  }, [flow.ready, flow.role, flow.state.welcomeSeen, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <Image source={mark} style={{ width: 88, height: 88 }} accessibilityLabel="EasyCasa" />
      <Text style={{ fontFamily: theme.font.mono, fontSize: 12, letterSpacing: 1.4, color: theme.colors.textMuted }}>
        EASYCASAITA.COM
      </Text>
    </View>
  );
}
