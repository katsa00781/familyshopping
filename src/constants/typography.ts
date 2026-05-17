export const typography = {
  'heading-xl':  { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: -0.68 },
  'heading-lg':  { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  'heading-md':  { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  'body-lg':     { fontSize: 17, lineHeight: 22, fontWeight: '400' as const },
  'body-md':     { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  'body-sm':     { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  'caption':     { fontSize: 11, lineHeight: 14, fontWeight: '400' as const, letterSpacing: 0.44 },
  'bolt-item':   { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
} as const

export type TypographyKey = keyof typeof typography
