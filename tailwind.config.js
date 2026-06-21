/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand (FamilyHub v2 – meleg, családias)
        primary: '#14B8A6',
        'primary-foreground': '#FFFFFF',
        accent: '#FB7185',
        destructive: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
        muted: '#8A8F8E',

        // Light surfaces
        background: '#F8F7F4',
        card: '#FFFFFF',
        border: '#E9E7E1',
        foreground: '#1C2B2A',
        'surface-sunken': '#EFEDE7',
        'surface-muted': '#F2F0EA',

        // Dark surfaces (meleg sötét, nem tiszta fekete)
        'dark-background': '#13201F',
        'dark-card': '#1B2B29',
        'dark-border': '#2A3B39',
        'dark-foreground': '#F8FAFC',

        // Bolt mód – meleg sötét (v2), theme-independent
        'bolt-bg': '#13201F',
        'bolt-bar': '#0E1817',
        'bolt-border': '#2A3B39',
        'bolt-unchecked': '#334155',

        // Tagszínek (családtag-azonosító)
        'member-teal': '#14B8A6',
        'member-coral': '#FB7185',
        'member-purple': '#A78BFA',
        'member-yellow': '#F59E0B',
        'member-blue': '#38BDF8',
        'member-green': '#34D399',

        // Kategória tintok (pastel-300)
        'cat-produce': '#86EFAC',
        'cat-dairy': '#93C5FD',
        'cat-meat': '#FCA5A5',
        'cat-bakery': '#FCD34D',
        'cat-other': '#CBD5E1',
      },

      spacing: {
        // Screen padding
        'screen-x': '16px',
        // Section spacing
        'section': '24px',
        // Row heights
        'row': '56px',
        'row-bolt': '72px',
        // CTA button
        'cta': '50px',
        // Min tap area
        'tap': '44px',
        // Bolt checkbox
        'bolt-cb': '56px',
      },

      borderRadius: {
        badge: '6px',
        card: '12px',
        button: '12px',
        sheet: '16px',
        fab: '9999px',
      },

      fontSize: {
        // heading-xl: 34/41 Bold -0.02em
        'heading-xl': ['34px', { lineHeight: '41px', fontWeight: '700', letterSpacing: '-0.02em' }],
        // heading-lg: 28/34 Bold
        'heading-lg': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        // heading-md: 22/28 Semibold
        'heading-md': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        // body-lg: 17/22 Regular
        'body-lg': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        // body-md: 15/20 Regular
        'body-md': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        // body-sm: 13/18 Regular
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        // caption: 11/14 Regular +0.04em
        'caption': ['11px', { lineHeight: '14px', fontWeight: '400', letterSpacing: '0.04em' }],
        // bolt-item: 24/30 Semibold
        'bolt-item': ['24px', { lineHeight: '30px', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}
