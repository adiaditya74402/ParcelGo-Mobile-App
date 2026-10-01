/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#17372F',
    tint: '#1E604B',
    background: '#F5F4EE',
    foreground: '#17372F',
    card: '#FFFFFF',
    cardForeground: '#17372F',
    primary: '#1E604B',
    primaryForeground: '#ffffff',
    secondary: '#E8ECE5',
    secondaryForeground: '#24473C',
    muted: '#EBECE6',
    mutedForeground: '#747D75',
    accent: '#F1D5B8',
    accentForeground: '#6E3E1D',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    border: '#DDE1D9',
    input: '#DDE1D9',
  },
  dark: {
    text: '#F1F3EA',
    tint: '#9BD1AE',
    background: '#13211C',
    foreground: '#F1F3EA',
    card: '#1D2D26',
    cardForeground: '#F1F3EA',
    primary: '#9BD1AE',
    primaryForeground: '#17372F',
    secondary: '#283B32',
    secondaryForeground: '#E1EAE0',
    muted: '#283B32',
    mutedForeground: '#A5B2A8',
    accent: '#563E2D',
    accentForeground: '#F4D2AE',
    destructive: '#F4776C',
    destructiveForeground: '#251513',
    border: '#35473D',
    input: '#35473D',
  },
  radius: 18,
};

export default colors;
