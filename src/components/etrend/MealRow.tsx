import { Pressable, Text, View } from 'react-native'
import { Clock, Coffee, Plus, Soup, UtensilsCrossed, Users } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'

import { colors, memberColors } from '@/constants/colors'
import type { MealType, Recipe } from '@/types'

interface MealRowProps {
  mealType: MealType
  label: string
  recipe: Recipe | null
  servings: number | null
  showDivider: boolean
  onPress: () => void
}

// Étkezésenkénti ikon + szín (a kanonikus HTML mockup szerint).
const MEAL_STYLE: Record<MealType, { icon: LucideIcon; color: string; tint: string }> = {
  reggeli: { icon: Coffee, color: colors.warning, tint: 'rgba(245,158,11,0.14)' },
  ebéd: { icon: Soup, color: colors.primary, tint: 'rgba(20,184,166,0.13)' },
  vacsora: { icon: UtensilsCrossed, color: memberColors[2], tint: 'rgba(167,139,250,0.16)' },
}

export function MealRow({ mealType, label, recipe, servings, showDivider, onPress }: MealRowProps) {
  const style = MEAL_STYLE[mealType]
  const Icon = style.icon

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        recipe ? `${label}: ${recipe.name}, módosítás` : `${label} hozzáadása`
      }
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 9,
        opacity: pressed ? 0.7 : 1,
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: colors.border,
      })}
    >
      <Text
        className="text-muted"
        style={{ width: 58, fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' }}
      >
        {label}
      </Text>

      {recipe ? (
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View
            style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: style.tint }}
          >
            <Icon size={24} color={style.color} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              className="text-foreground dark:text-dark-foreground"
              numberOfLines={1}
              style={{ fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 }}
            >
              {recipe.name}
            </Text>
            <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              {servings != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Users size={13} color={colors.muted} strokeWidth={2} />
                  <Text className="text-muted" style={{ fontSize: 12, fontWeight: '700' }}>
                    {servings} adag
                  </Text>
                </View>
              ) : null}
              {recipe.prep_time != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} color={colors.muted} strokeWidth={2} />
                  <Text className="text-muted" style={{ fontSize: 12, fontWeight: '700' }}>
                    {recipe.prep_time} perc
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 46,
            paddingHorizontal: 14,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.border,
            borderRadius: 13,
            backgroundColor: 'rgba(138,143,142,0.04)',
          }}
        >
          <Plus size={17} color={colors.muted} strokeWidth={2.4} />
          <Text className="text-muted" style={{ fontSize: 13.5, fontWeight: '800' }}>
            recept
          </Text>
        </View>
      )}
    </Pressable>
  )
}
