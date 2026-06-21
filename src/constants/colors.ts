export const colors = {
  // Brand (FamilyHub v2 – meleg, családias)
  primary:            '#14B8A6', // teal-500
  primaryLight:       '#5EEAD4', // teal-300 – aktív tab tint, halvány kiemelés
  primaryForeground:  '#FFFFFF',
  accent:             '#FB7185', // korall – kiemelés, „ma", riasztás
  destructive:        '#EF4444',
  success:            '#22C55E',
  warning:            '#F59E0B',
  muted:              '#8A8F8E',

  background:  '#F8F7F4', // meleg törtfehér
  card:        '#FFFFFF',
  border:      '#E9E7E1',
  foreground:  '#1C2B2A', // meleg sötét

  surfaceSunken: '#EFEDE7', // süllyesztett meleg-neutrál (szegmens-sáv, számláló-pirula)
  surfaceMuted:  '#F2F0EA', // halvány meleg-neutrál chip háttér (kompakt lista-kártya ikon)

  darkBackground: '#13201F', // meleg, nagyon sötét
  darkCard:       '#1B2B29',
  darkBorder:     '#2A3B39',
  darkForeground: '#F8FAFC',

  boltBg:     '#13201F', // meleg, nagyon sötét (v2 – lágyított, magas kontraszt marad)
  boltBar:    '#0E1817', // sticky bar
  boltBorder: '#2A3B39', // hairline

  cat: {
    produce: '#86EFAC',
    dairy:   '#93C5FD',
    meat:    '#FCA5A5',
    bakery:  '#FCD34D',
    other:   '#CBD5E1',
  },
} as const

/**
 * Tagszín-készlet – minden családtag saját színt kap (avatar-gyűrű,
 * naptáresemény, hozzárendelt feladat). A `member_color` mező ezekből
 * az értékekből veszi fel egyet; index szerint determinisztikusan
 * választható (`memberColorAt`).
 */
export const memberColors = [
  '#14B8A6', // teal
  '#FB7185', // korall
  '#A78BFA', // lila
  '#F59E0B', // sárga
  '#38BDF8', // kék
  '#34D399', // zöld
] as const

export function memberColorAt(index: number): string {
  const palette = memberColors
  return palette[((index % palette.length) + palette.length) % palette.length]!
}

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
