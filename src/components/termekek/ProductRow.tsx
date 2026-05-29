import { useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { useRouter } from 'expo-router'
import { Pencil, Trash2 } from 'lucide-react-native'

import { CategoryBadge } from '@/components/ui/Badge'
import { catBg, catAbbr } from '@/constants/colors'
import { formatHuf } from '@/lib/format'
import type { ItemCategory, Product } from '@/types'

const VALID_CATEGORIES: ItemCategory[] = ['Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']

interface Props {
  product: Product
  onDelete: () => void
}

export default function ProductRow({ product, onDelete }: Props) {
  const router = useRouter()
  const swipeRef = useRef<Swipeable>(null)
  const tileBg = catBg[product.category] ?? catBg['Egyéb']
  const abbr = catAbbr[product.category] ?? product.category.slice(0, 3).toUpperCase()
  const isValidCat = VALID_CATEGORIES.includes(product.category as ItemCategory)

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
          router.push(`/termekek/${product.id}`)
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
        onPress={() => router.push(`/termekek/${product.id}`)}
        className="flex-row items-center h-row px-screen-x bg-card dark:bg-dark-card border-b border-border dark:border-dark-border"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {/* Category tile: 40×40pt */}
        <View style={[styles.tile, { backgroundColor: tileBg }]}>
          <Text style={styles.tileLabel}>{abbr}</Text>
        </View>

        {/* Name + brand + price */}
        <View className="flex-1 mx-3 gap-0.5">
          <Text
            className="text-body-md font-semibold text-foreground dark:text-dark-foreground"
            numberOfLines={1}
          >
            {product.name}
            {product.brand ? ` · ${product.brand}` : ''}
          </Text>
          {product.price != null && (
            <Text className="text-body-sm text-muted">
              {formatHuf(product.price)} / {product.unit}
            </Text>
          )}
        </View>

        {/* Category badge */}
        {isValidCat && <CategoryBadge category={product.category as ItemCategory} />}
      </Pressable>
    </Swipeable>
  )
}

const styles = StyleSheet.create({
  tile: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.42)',
    letterSpacing: 1,
  },
})
