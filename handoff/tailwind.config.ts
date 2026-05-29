/**
 * Tailwind / NativeWind config for Bevásárló.
 * Drop into project root and import tokens by reading tokens.json
 * (so the source of truth stays in one place).
 *
 * NativeWind v4 reads this file the same way Tailwind does.
 */

import type { Config } from 'tailwindcss';
import tokens from './handoff/tokens/tokens.json';

const cat = tokens.category;
const c = tokens.color;
const t = tokens.typography;

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: c.primary.value,
          foreground: c.primaryForeground.value,
        },
        secondary: {
          DEFAULT: c.secondary.value,
          foreground: c.secondaryForeground.value,
        },
        destructive: c.destructive.value,
        success: c.success.value,
        warning: c.warning.value,
        muted: c.muted.light.value, // dark variant via `dark:` modifier
        background: c.background.light.value,
        card: c.card.light.value,
        border: c.border.light.value,
        foreground: c.foreground.light.value,

        // Bolt mód surfaces — theme-independent
        'bolt-bg':         c.boltBg.value,
        'bolt-bar':        c.boltBar.value,
        'bolt-bar-border': c.boltBarBorder.value,

        // Category tints
        cat: {
          produce: cat.produce.value,
          dairy:   cat.dairy.value,
          meat:    cat.meat.value,
          bakery:  cat.bakery.value,
          other:   cat.other.value,
        },
      },

      fontSize: {
        'heading-xl':    [`${t.headingXl.fontSize}px`,    { lineHeight: `${t.headingXl.lineHeight}px`,    fontWeight: t.headingXl.fontWeight }],
        'heading-lg':    [`${t.headingLg.fontSize}px`,    { lineHeight: `${t.headingLg.lineHeight}px`,    fontWeight: t.headingLg.fontWeight }],
        'heading-md':    [`${t.headingMd.fontSize}px`,    { lineHeight: `${t.headingMd.lineHeight}px`,    fontWeight: t.headingMd.fontWeight }],
        'body-lg':       [`${t.bodyLg.fontSize}px`,       { lineHeight: `${t.bodyLg.lineHeight}px` }],
        'body-md':       [`${t.bodyMd.fontSize}px`,       { lineHeight: `${t.bodyMd.lineHeight}px` }],
        'body-sm':       [`${t.bodySm.fontSize}px`,       { lineHeight: `${t.bodySm.lineHeight}px` }],
        'caption':       [`${t.caption.fontSize}px`,      { lineHeight: `${t.caption.lineHeight}px`, letterSpacing: '0.04em' }],
        'bolt-mod-item': [`${t.boltModItem.fontSize}px`,  { lineHeight: `${t.boltModItem.lineHeight}px`,  fontWeight: t.boltModItem.fontWeight }],
      },

      borderRadius: {
        badge:  `${tokens.radius.badge.value}px`,
        input:  `${tokens.radius.input.value}px`,
        card:   `${tokens.radius.card.value}px`,
        button: `${tokens.radius.button.value}px`,
        sheet:  `${tokens.radius.sheet.value}px`,
      },

      spacing: {
        // tokens.s1 -> 1, tokens.s4 -> 4 in Tailwind's 4pt grid
        // Already matches default tailwind scale; we only add custom names.
        'screen-x': `${tokens.layout.screenPaddingX.value}px`,
        'card':     `${tokens.layout.cardPadding.value}px`,
        'section':  `${tokens.layout.sectionSpacing.value}px`,
        'row':      `${tokens.layout.listRowDefault.value}px`,
        'row-bolt': `${tokens.layout.listRowBolt.value}px`,
        'cta':      `${tokens.layout.ctaHeight.value}px`,
        'tap':      `${tokens.layout.minTapTarget.value}px`,
        'cb-bolt':  `${tokens.layout.boltCheckbox.value}px`,
        'cb-list':  `${tokens.layout.listCheckbox.value}px`,
      },

      boxShadow: {
        sm: tokens.shadow.sm.value,
        md: tokens.shadow.md.value,
        xl: tokens.shadow.xl.value,
      },
    },
  },
  plugins: [],
} satisfies Config;
