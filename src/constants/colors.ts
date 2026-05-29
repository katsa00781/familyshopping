export const colors = {
  primary:      '#2563EB',
  primaryLight: '#60A5FA',
  destructive: '#EF4444',
  success:     '#22C55E',
  warning:     '#F59E0B',
  muted:       '#94A3B8',

  background:  '#F1F5F9',
  card:        '#FFFFFF',
  border:      '#E2E8F0',
  foreground:  '#0F172A',

  darkBackground: '#0F172A',
  darkCard:       '#1E293B',
  darkBorder:     '#334155',
  darkForeground: '#F8FAFC',

  boltBg:     '#000000',
  boltBar:    '#111827',
  boltBorder: '#1F2937',

  cat: {
    produce: '#86EFAC',
    dairy:   '#93C5FD',
    meat:    '#FCA5A5',
    bakery:  '#FCD34D',
    other:   '#CBD5E1',
  },
} as const

export const catBg: Record<string, string> = {
  'Zöldség':   colors.cat.produce,
  'Tejtermék': colors.cat.dairy,
  'Hús':       colors.cat.meat,
  'Pékáru':    colors.cat.bakery,
  'Egyéb':     colors.cat.other,
}

export const catAbbr: Record<string, string> = {
  'Zöldség':   'ZÖL',
  'Tejtermék': 'TEJ',
  'Hús':       'HÚS',
  'Pékáru':    'PÉK',
  'Egyéb':     'EGY',
}
