import { useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { useRouter } from 'expo-router'
import { Pencil, Trash2 } from 'lucide-react-native'

import { CategoryBadge } from '@/components/ui/Badge'
import type { ItemCategory, Product } from '@/types'

const CAT_BG: Record<string, string> = {
  'Zöldség':   '#86EFAC',
  'Tejtermék': '#93C5FD',
  'Hús':       '#FCA5A5',
  'Pékáru':    '#FCD34D',
  'Egyéb':     '#CBD5E1',
}

const CAT_ABBR: Record<string, string> = {
  'Zöldség':   'ZÖL',
  'Tejtermék': 'TEJ',
  'Hús':       'HÚS',
  'Pékáru':    'PÉK',
  'Egyéb':     'EGY',
}

const VALID_CATEGORIES: ItemCategory[] = ['Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']

interface Props {
  product: Product
  onDelete: () => void
}

export default function ProductRow({ product, onDelete }: Props) {
  const router = useRouter()
  const swipeRef = useRef<Swipeable>(null)
  const tileBg = CAT_BG[product.category] ?? '#CBD5E1'
  const abbr = CAT_ABBR[product.category] ?? product.category.slice(0, 3).toUpperCase()
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
              {product.price.toLocaleString('hu-HU')} Ft / {product.unit}
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
