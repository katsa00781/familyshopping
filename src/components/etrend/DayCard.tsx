import { Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'

import { MealRow } from './MealRow'
import { MEAL_TYPES, dayDateLabel, weekdayFull } from '@/lib/recipes'
import { colors } from '@/constants/colors'
import type { FamilyMemberLocal, MealPlanEntry, MealType, Product, Recipe } from '@/types'

interface DayCardProps {
  date: Date
  isToday: boolean
  entriesByMeal: Map<MealType, MealPlanEntry[]>
  recipesById: Map<string, Recipe>
  membersById: Map<string, FamilyMemberLocal>
  productsById: Map<string, Product>
  selectable: boolean
  selected: boolean
  onToggle: () => void
  onAddEntry: (mealType: MealType) => void
  onRemoveEntry: (id: string) => void
}

const todayShadow = {
  shadowColor: colors.accent,
  shadowOpacity: 0.14,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
}

const cardShadow = {
  shadowColor: '#1C2B2A',
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
}

export function DayCard({
  date,
  isToday,
  entriesByMeal,
  recipesById,
  membersById,
  productsById,
  selectable,
  selected,
  onToggle,
  onAddEntry,
  onRemoveEntry,
}: DayCardProps) {
  const count = entriesByMeal.size
  const meta = count > 0 ? `${count} étkezés` : 'üres'

  return (
    <View
      className="bg-card dark:bg-dark-card"
      style={[
        { borderRadius: 22, padding: 16, paddingTop: 14 },
        isToday
          ? { borderWidth: 1.5, borderColor: 'rgba(251,113,133,0.55)', ...todayShadow }
          : cardShadow,
      ]}
    >
      {/* Fejléc: kijelölő checkbox + nap neve/dátuma + étkezésszám */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          paddingBottom: 12,
          marginBottom: 4,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={onToggle}
          disabled={!selectable}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected, disabled: !selectable }}
          accessibilityLabel={`${weekdayFull(date)} kijelölése a bevásárlólistához`}
          hitSlop={8}
          style={{
            width: 24,
            height: 24,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : 'transparent',
            opacity: selectable ? 1 : 0.5,
          }}
        >
          {selected ? <Check size={14} color="#FFFFFF" strokeWidth={3.2} /> : null}
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              className="text-foreground dark:text-dark-foreground"
              style={{ fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2 }}
            >
              {weekdayFull(date)}
            </Text>
            {isToday ? (
              <View style={{ backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Ma
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-muted" style={{ marginTop: 1, fontSize: 12.5, fontWeight: '700' }}>
            {dayDateLabel(date)}
          </Text>
        </View>

        <Text className="text-muted" style={{ fontSize: 12, fontWeight: '700' }}>
          {meta}
        </Text>
      </View>

      {/* Étkezések */}
      <View>
        {MEAL_TYPES.map((m, i) => (
          <MealRow
            key={m.key}
            mealType={m.key}
            label={m.label}
            entries={entriesByMeal.get(m.key) ?? []}
            recipesById={recipesById}
            membersById={membersById}
            productsById={productsById}
            showDivider={i > 0}
            onAdd={() => onAddEntry(m.key)}
            onRemoveEntry={onRemoveEntry}
          />
        ))}
      </View>
    </View>
  )
}
