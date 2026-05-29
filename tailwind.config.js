/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand
        primary: '#2563EB',
        destructive: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
        muted: '#94A3B8',

        // Light surfaces
        background: '#F1F5F9',
        card: '#FFFFFF',
        border: '#E2E8F0',
        foreground: '#0F172A',

        // Dark surfaces
        'dark-background': '#0F172A',
        'dark-card': '#1E293B',
        'dark-border': '#334155',
        'dark-foreground': '#F8FAFC',

        // Bolt mód – true black, mindig
        'bolt-bg': '#000000',
        'bolt-bar': '#111827',
        'bolt-border': '#1F2937',
        'bolt-unchecked': '#334155',

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
