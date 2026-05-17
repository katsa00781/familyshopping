import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

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
}

export default function ProductCard({ product }: Props) {
  const router = useRouter()
  const tileBg = CAT_BG[product.category] ?? '#CBD5E1'
  const abbr = CAT_ABBR[product.category] ?? product.category.slice(0, 3).toUpperCase()
  const isValidCat = VALID_CATEGORIES.includes(product.category as ItemCategory)

  function handleLongPress() {
    Alert.alert(product.name, undefined, [
      { text: 'Listához adás', onPress: () => {} },
      { text: 'Szerkesztés', onPress: () => router.push(`/termekek/${product.id}`) },
      { text: 'Mégse', style: 'cancel' },
    ])
  }

  return (
    <Pressable
      onPress={() => router.push(`/termekek/${product.id}`)}
      onLongPress={handleLongPress}
      className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-card overflow-hidden flex-1"
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {/* Category tile: 80pt tall, full card width */}
      <View style={[styles.tile, { backgroundColor: tileBg }]}>
        <Text style={styles.tileLabel}>{abbr}</Text>
      </View>

      {/* Content */}
      <View className="p-3 gap-0.5">
        <Text
          className="text-body-md font-semibold text-foreground dark:text-dark-foreground"
          numberOfLines={1}
        >
          {product.name}
        </Text>
        {product.brand ? (
          <Text className="text-body-sm text-muted" numberOfLines={1}>
            {product.brand}
          </Text>
        ) : (
          <View style={{ height: 18 }} />
        )}
        <View className="flex-row items-center justify-between mt-1.5">
          <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
            {product.price != null ? `${product.price.toLocaleString('hu-HU')} Ft` : '–'}
          </Text>
          {isValidCat && <CategoryBadge category={product.category as ItemCategory} />}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.82 },
  tile: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.38)',
    letterSpacing: 3,
  },
})
