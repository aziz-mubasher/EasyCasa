/**
 * EasyCasa brand tokens — aligned with EC-APP-1 design v2
 * (`docs/azm-deliverables/EC-APP-1/design-v2/source/*.html`).
 */
export const tokens = {
  color: {
    /** Parchment app background */
    parchment: '#f3ede1',
    paper: '#f3ede1',
    /** Soft card surface */
    cream: '#fffcf6',
    sand: '#e8dfcc',
    /** Ink — primary dark / buttons */
    ink: '#14212e',
    primaryDark: '#14212e',
    /** Azure accent */
    azure: '#2c6e9b',
    primary: '#2c6e9b',
    azureDeep: '#1f5478',
    /** Soft text */
    muted: '#4c5d6e',
    line: 'rgba(20,33,46,0.12)',
    ochre: '#c08a1e',
    orange: '#f28c0f',
    pine: '#1f6f5c',
    clay: '#c4553b',
    verifiedBg: '#e3efe9',
    sellerIconBg: '#fbe7cf',
    sellerIcon: '#c8650a',
  },
  radius: { sm: 8, md: 14, lg: 18, xl: 26 },
  font: {
    display: 'BricolageGrotesque_700Bold',
    displaySemi: 'BricolageGrotesque_600SemiBold',
    displayMed: 'BricolageGrotesque_500Medium',
    body: 'Newsreader_400Regular',
    bodyMed: 'Newsreader_500Medium',
    mono: 'IBMPlexMono_500Medium',
    monoReg: 'IBMPlexMono_400Regular',
  },
} as const;
