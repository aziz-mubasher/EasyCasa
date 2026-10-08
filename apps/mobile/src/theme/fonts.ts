import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  useFonts as useBricolage,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  useFonts as usePlex,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  useFonts as useNewsreader,
} from '@expo-google-fonts/newsreader';

/** Load EC-APP-1 display / body / mono stacks. Call once in root layout. */
export function useAppFonts(): boolean {
  const [a] = useBricolage({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });
  const [b] = useNewsreader({
    Newsreader_400Regular,
    Newsreader_500Medium,
  });
  const [c] = usePlex({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  return a && b && c;
}
