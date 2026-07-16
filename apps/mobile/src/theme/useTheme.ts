import { useColorScheme } from 'react-native';
import { themeFor, type Theme } from './theme';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return themeFor(scheme);
}
