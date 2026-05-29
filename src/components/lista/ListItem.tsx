import { useEffect, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { Check, Pencil, Trash2 } from 'lucide-react-native'

import { CategoryBadge } from '@/components/ui/Badge'
import { colors } from '@/constants/colors'
import { formatHuf } from '@/lib/format'
import type { ShoppingItem } from '@/types'

interface Props {
  item: ShoppingItem
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
}

export default function ListItem({ item, onToggle, onDelete, onEdit }: Props) {
  const swipeRef = useRef<Swipeable>(null)
  const checkScale = useSharedValue(item.checked ? 1 : 0)

  useEffect(() => {
    checkScale.value = withSpring(item.checked ? 1 : 0, {
      mass: 0.3,
      stiffness: 220,
      damping: 14,
    })
  }, [item.checked, checkScale])

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }))

  function renderRightActions() {
    return (
      <Pressable
        className="bg-destructive justify-center items-center"
        style={{ width: 80 }}
        onPress={() => {
          swipeRef.current?.close()
          onDelete()
        }}
      >
        <Trash2 size={22} color="#FFFFFF" />
        <Text className="text-white text-caption mt-1">Törlés</Text>
      </Pressable>
    )
  }

  function renderLeftActions() {
    return (
      <Pressable
        className="bg-primary justify-center items-center"
        style={{ width: 80 }}
        onPress={() => {
          swipeRef.current?.close()
          onEdit()
        }}
      >
        <Pencil size={22} color="#FFFFFF" />
        <Text className="text-white text-caption mt-1">Szerk.</Text>
      </Pressable>
    )
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
    >
      <Pressable
        onPress={onToggle}
        className="flex-row items-center h-row px-screen-x bg-card dark:bg-dark-card border-b border-border dark:border-dark-border"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : item.checked ? 0.55 : 1,
        })}
      >
        {/* Checkbox: 44pt tap area, 24pt visual */}
        <View className="w-tap h-tap items-center justify-center mr-2">
          <View
            className="w-6 h-6 rounded-[4px] items-center justify-center"
            style={{
              borderWidth: 2,
              borderColor: item.checked ? colors.primary : colors.border,
              backgroundColor: item.checked ? colors.primary : 'transparent',
            }}
          >
            <Animated.View style={checkAnimStyle}>
              <Check size={14} color={colors.card} strokeWidth={2.8} />
            </Animated.View>
          </View>
        </View>

        {/* Középső: név + menny */}
        <View className="flex-1 gap-0.5">
          <Text
            className="text-body-lg text-foreground dark:text-dark-foreground"
            numberOfLines={1}
            style={item.checked ? { textDecorationLine: 'line-through' } : undefined}
          >
            {item.name}
          </Text>
          <Text className="text-body-sm text-muted">
            {item.quantity} {item.unit}
          </Text>
        </View>

        {/* Jobb: ár + kategória badge */}
        <View className="items-end gap-0.5 ml-2">
          {item.price != null && (
            <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
              {formatHuf(item.price)}
            </Text>
          )}
          <CategoryBadge category={item.category} />
        </View>
      </Pressable>
    </Swipeable>
  )
}
