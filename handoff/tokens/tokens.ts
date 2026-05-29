/**
 * Bevásárló Design Tokens — typed mirror of `tokens.json`.
 *
 * Import from app code:
 *   import { tokens, colors, type Category } from '@/theme/tokens';
 *
 * Do NOT edit values here without first updating tokens.json — they must stay in sync.
 * Tailwind reads the JSON; this file is for components that need direct token access
 * (e.g. animated values, native modules, accessibility hints).
 */

export const colors = {
  primary: '#2563EB',
  primaryForeground: '#FFFFFF',
  secondary: '#F1F5F9',
  secondaryForeground: '#0F172A',
  destructive: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  muted: {
    light: '#94A3B8',
    dark: '#94A3B8',
  },
  background: {
    light: '#FFFFFF',
    dark: '#0F172A',
  },
  card: {
    light: '#FFFFFF',
    dark: '#1E293B',
  },
  border: {
    light: '#E2E8F0',
    dark: '#334155',
  },
  foreground: {
    light: '#0F172A',
    dark: '#F8FAFC',
  },
  boltBg: '#000000',
  boltBar: '#111827',
  boltBarBorder: '#1F2937',
} as const;

export const category = {
  produce: '#86EFAC',
  dairy: '#93C5FD',
  meat: '#FCA5A5',
  bakery: '#FCD34D',
  other: '#CBD5E1',
} as const;
export type Category = keyof typeof category;

export const source = {
  ocr:    { bg: '#F3E8FF', fg: '#6B21A8' },
  list:   { bg: '#DBEAFE', fg: '#1E40AF' },
  manual: { bg: '#E2E8F0', fg: '#334155' },
  import: { bg: '#FFEDD5', fg: '#9A3412' },
} as const;
export type Source = keyof typeof source;

export const role = {
  admin:  { bg: '#DBEAFE', fg: '#1E40AF', label: 'Admin' },
  member: { bg: '#DCFCE7', fg: '#166534', label: 'Tag' },
  viewer: { bg: '#FEF3C7', fg: '#92400E', label: 'Néző' },
} as const;
export type Role = keyof typeof role;

export const typography = {
  fontFamily: {
    default: undefined, // RN: omit -> SF Pro on iOS, system on Android
    mono: 'Menlo',
  },
  headingXl:   { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: -0.68 },
  headingLg:   { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.28 },
  headingMd:   { fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: 0 },
  bodyLg:      { fontSize: 17, lineHeight: 22, fontWeight: '400' as const },
  bodyMd:      { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  bodySm:      { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption:     { fontSize: 11, lineHeight: 14, fontWeight: '400' as const, letterSpacing: 0.44 },
  boltModItem: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
} as const;

export const spacing = {
  px: 1,
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
} as const;

export const layout = {
  screenPaddingX: 16,
  cardPadding: 16,
  sectionSpacing: 24,
  listRowDefault: 56,
  listRowBolt: 72,
  ctaHeight: 50,
  tabBarHeight: 49,
  minTapTarget: 44,
  boltCheckbox: 56,
  listCheckbox: 24,
  frameWidth: 390,
  frameHeight: 844,
} as const;

export const radius = {
  badge: 6,
  input: 10,
  card: 12,
  button: 12,
  sheet: 16,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 60,
    elevation: 12,
  },
} as const;

export const motion = {
  // Reanimated v3 spring configs (use with withSpring)
  spring: {
    soft:   { damping: 20, stiffness: 180, mass: 1 },
    medium: { damping: 16, stiffness: 200, mass: 1 },
    bouncy: { damping: 12, stiffness: 220, mass: 1 },
    save:   { damping: 14, stiffness: 200, mass: 1 },
  },
  duration: {
    instant: 0,
    fast: 120,
    base: 200,
    slow: 350,
  },
} as const;

export const tokens = {
  colors,
  category,
  source,
  role,
  typography,
  spacing,
  layout,
  radius,
  shadow,
  motion,
} as const;

export type Tokens = typeof tokens;
