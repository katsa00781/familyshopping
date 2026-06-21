import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

import { colors } from '@/constants/colors'

type Tint = 'primary' | 'accent'
type SubtitleTint = 'muted' | 'accent'

interface DashboardCardProps {
  icon: LucideIcon
  tint: Tint
  title: string
  subtitle?: string
  subtitleTint?: SubtitleTint
  /** Korall „glow" árnyék a kiemelt (Ma) kártyához. */
  accentShadow?: boolean
  accessibilityLabel: string
  onPress?: () => void
  children?: ReactNode
}

const TINT: Record<Tint, { chip: string; color: string }> = {
  primary: { chip: 'bg-primary/15', color: colors.primary },
  accent: { chip: 'bg-accent/15', color: colors.accent },
}

// Lágy, meleg árnyékok (a HTML mockup box-shadow értékei).
const shadowBase = {
  shadowColor: colors.foreground,
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
}

const shadowAccent = {
  shadowColor: colors.accent,
  shadowOpacity: 0.18,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
}

/**
 * Kezdőlap kártya-alap: bal oldali színes ikon-chip (teal/korall tint) +
 * cím és opcionális alcím, alatta a kártya tartalma. Lágy lekerekített
 * FamilyWall-stílus, árnyékkal (a kiemelt kártya korall glow-t kap).
 */
export function DashboardCard({
  icon: Icon,
  tint,
  title,
  subtitle,
  subtitleTint = 'muted',
  accentShadow = false,
  accessibilityLabel,
  onPress,
  children,
}: DashboardCardProps) {
  const t = TINT[tint]

  // A statikus stílusokat (padding, árnyék, radius) egy belső View hordozza
  // objektum-formájú style + className formában — NativeWind v4-ben a Pressable
  // függvény-formájú style-jából a statikus property-k eldobódnak className mellett.
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.95 : 1 })}
    >
      <View
        style={[accentShadow ? shadowAccent : shadowBase, { padding: 18 }]}
        className="rounded-3xl bg-card dark:bg-dark-card dark:border dark:border-dark-border"
      >
        <View className="flex-row items-center" style={{ gap: 13 }}>
          <View
            className={`items-center justify-center ${t.chip}`}
            style={{ width: 44, height: 44, borderRadius: 15 }}
          >
            <Icon size={23} color={t.color} strokeWidth={1.75} />
          </View>
          <View className="flex-1">
            <Text
              className="text-foreground dark:text-dark-foreground"
              style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.2 }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                className={subtitleTint === 'accent' ? 'text-accent' : 'text-muted'}
                style={{ fontSize: 13.5, fontWeight: '600', marginTop: 1 }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {children ? <View>{children}</View> : null}
      </View>
    </Pressable>
  )
}
