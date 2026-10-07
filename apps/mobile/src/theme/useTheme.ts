import { useColorScheme } from 'react-native';
import { themeFor, type Theme } from './theme';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  // RN 0.83 adds "unspecified". Treat it like a missing scheme (light theme).
  return themeFor(scheme === 'dark' || scheme === 'light' ? scheme : null);
}
