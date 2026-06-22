import { Pressable, Text, View } from 'react-native'
import { Coffee, Plus, Soup, UtensilsCrossed, X } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'

import { formatHuf } from '@/lib/format'
import { colors, memberColors } from '@/constants/colors'
import type { FamilyMemberLocal, MealPlanEntry, MealType, Product, Recipe } from '@/types'

interface MealRowProps {
  mealType: MealType
  label: string
  entries: MealPlanEntry[]
  recipesById: Map<string, Recipe>
  membersById: Map<string, FamilyMemberLocal>
  productsById: Map<string, Product>
  showDivider: boolean
  onAdd: () => void
  onRemoveEntry: (id: string) => void
}

// Étkezésenkénti ikon + szín (a kanonikus HTML mockup szerint).
const MEAL_STYLE: Record<MealType, { icon: LucideIcon; color: string; tint: string }> = {
  reggeli: { icon: Coffee, color: colors.warning, tint: 'rgba(245,158,11,0.14)' },
  ebéd: { icon: Soup, color: colors.primary, tint: 'rgba(20,184,166,0.13)' },
  vacsora: { icon: UtensilsCrossed, color: memberColors[2], tint: 'rgba(167,139,250,0.16)' },
}

// Termék-tétel összegár (egységár × mennyiség), ha van katalógus-ár.
function entryPrice(entry: MealPlanEntry, productsById: Map<string, Product>): number | null {
  if (!entry.product_id) return null
  const unitPrice = productsById.get(entry.product_id)?.price
  if (unitPrice == null) return null
  return unitPrice * (entry.quantity ?? 1)
}

function formatQty(q: number | null): string {
  if (q == null) return ''
  return Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100)
}

export function MealRow({
  mealType,
  label,
  entries,
  recipesById,
  membersById,
  productsById,
  showDivider,
  onAdd,
  onRemoveEntry,
}: MealRowProps) {
  const style = MEAL_STYLE[mealType]
  const Icon = style.icon

  return (
    <View
      style={{
        paddingVertical: 10,
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: colors.border,
        flexDirection: 'row',
        gap: 12,
      }}
    >
      <Text
        className="text-muted"
        style={{ width: 58, paddingTop: 3, fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' }}
      >
        {label}
      </Text>

      <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
        {entries.map((entry) => {
          const member = entry.member_id ? membersById.get(entry.member_id) ?? null : null
          const dotColor = member?.color ?? colors.muted
          const recipe = entry.recipe_id ? recipesById.get(entry.recipe_id) ?? null : null
          const isRecipe = entry.recipe_id != null
          const mainText = isRecipe
            ? recipe?.name ?? 'Recept'
            : `${formatQty(entry.quantity)}${entry.unit ? ` ${entry.unit}` : ''} ${entry.item_name ?? ''}`.trim()
          const price = entryPrice(entry, productsById)

          return (
            <View
              key={entry.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: 'rgba(138,143,142,0.06)' }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: isRecipe ? style.tint : 'rgba(138,143,142,0.12)' }}>
                <Icon size={15} color={isRecipe ? style.color : colors.muted} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className="text-foreground dark:text-dark-foreground" numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 }}>
                  {mainText}
                </Text>
                <View style={{ marginTop: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: dotColor }} />
                  <Text className="text-muted" numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700' }}>
                    {member?.name ?? 'Közös'}
                    {price != null ? ` · ${formatHuf(price)}` : ''}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => onRemoveEntry(entry.id)}
                accessibilityLabel={`${mainText} eltávolítása`}
                hitSlop={8}
                style={{ width: 26, height: 26, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} color={colors.muted} strokeWidth={2.4} />
              </Pressable>
            </View>
          )
        })}

        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`${label}: tétel hozzáadása`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            height: entries.length > 0 ? 36 : 46,
            paddingHorizontal: 12,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: 'rgba(138,143,142,0.04)',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Plus size={16} color={colors.muted} strokeWidth={2.4} />
          <Text className="text-muted" style={{ fontSize: 13, fontWeight: '800' }}>
            {entries.length > 0 ? 'Tétel hozzáadása' : 'recept vagy termék'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
