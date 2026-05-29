import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useColorScheme } from 'nativewind'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Grid3X3, List, Plus } from 'lucide-react-native'

import { useProductStore } from '@/store/productStore'
import ProductCard from '@/components/termekek/ProductCard'
import ProductRow from '@/components/termekek/ProductRow'
import EmptyState from '@/components/ui/EmptyState'
import { colors } from '@/constants/colors'
import Skeleton from '@/components/ui/Skeleton'
import Input from '@/components/ui/Input'
import type { ItemCategory, Product } from '@/types'

const VIEW_KEY = 'bevasarlo_products_view'
const CATEGORIES: (ItemCategory | 'Összes')[] = ['Összes', 'Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']
const MIN_SKELETON_MS = 600

type ViewMode = 'grid' | 'list'

function GridSkeletons({ count }: { count: number }) {
  return (
    <View className="flex-row flex-wrap px-3 pt-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="flex-1" style={{ minWidth: '40%' }}>
          <Skeleton variant="card" isLoading={true} />
        </View>
      ))}
    </View>
  )
}

function ListSkeletons({ count }: { count: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="listRow" isLoading={true} />
      ))}
    </View>
  )
}

export default function TermekekScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { width } = useWindowDimensions()

  const products = useProductStore((s) => s.products)
  const isLoading = useProductStore((s) => s.isLoading)
  const error = useProductStore((s) => s.error)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const deleteProduct = useProductStore((s) => s.deleteProduct)

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'Összes'>('Összes')
  const [searchQuery, setSearchQuery] = useState('')
  const [minDone, setMinDone] = useState(false)
  const mountedAt = useRef(Date.now())

  // Load products on mount
  useEffect(() => {
    loadProducts()
    const elapsed = Date.now() - mountedAt.current
    const remaining = Math.max(0, MIN_SKELETON_MS - elapsed)
    const timer = setTimeout(() => setMinDone(true), remaining)
    return () => clearTimeout(timer)
  }, [loadProducts])

  // Persist view mode
  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY).then((v) => {
      if (v === 'grid' || v === 'list') setViewMode(v)
    })
  }, [])

  function toggleViewMode() {
    const next: ViewMode = viewMode === 'grid' ? 'list' : 'grid'
    setViewMode(next)
    AsyncStorage.setItem(VIEW_KEY, next)
  }

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === 'Összes' || p.category === activeCategory
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.brand?.toLowerCase().includes(q) ?? false)
    return matchesCategory && matchesSearch
  })

  const showSkeleton = isLoading || !minDone

  // Grid: 2 columns with gap
  const GRID_GAP = 12
  const PADDING = 16
  const cardWidth = (width - PADDING * 2 - GRID_GAP) / 2

  const renderGridItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={{ width: cardWidth }}>
        <ProductCard product={item} />
      </View>
    ),
    [cardWidth]
  )

  const renderListItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductRow product={item} onDelete={() => deleteProduct(item.id)} />
    ),
    [deleteProduct]
  )

  const Header = (
    <>
      {/* Large title */}
      <View
        className="px-screen-x border-b border-border dark:border-dark-border"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <Text className="text-heading-xl font-bold text-foreground dark:text-dark-foreground">
          Termékek
        </Text>
      </View>

      {/* Search + toggle row */}
      <View className="flex-row items-center gap-3 px-screen-x pt-3 pb-2">
        <View className="flex-1">
          <Input
            type="search"
            placeholder="Keresés..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          className="w-tap h-tap items-center justify-center rounded-button bg-card dark:bg-dark-card border border-border dark:border-dark-border"
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          onPress={toggleViewMode}
        >
          {viewMode === 'grid'
            ? <List size={20} color={dark ? colors.darkForeground : colors.foreground} />
            : <Grid3X3 size={20} color={dark ? colors.darkForeground : colors.foreground} />}
        </Pressable>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`h-8 px-4 rounded-fab items-center justify-center ${
                active
                  ? 'bg-primary'
                  : 'bg-card dark:bg-dark-card border border-border dark:border-dark-border'
              }`}
              style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            >
              <Text
                className={`text-caption font-semibold ${
                  active ? 'text-white' : 'text-foreground dark:text-dark-foreground'
                }`}
              >
                {cat}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </>
  )

  return (
    <SafeAreaView style={styles.safeArea} className="bg-background dark:bg-dark-background" edges={['top']}>
      {/* Header area (non-scrollable) */}
      <View className="bg-background dark:bg-dark-background">
        {Header}
      </View>

      {/* Content */}
      {showSkeleton ? (
        <ScrollView>
          {viewMode === 'grid' ? <GridSkeletons count={6} /> : <ListSkeletons count={6} />}
        </ScrollView>
      ) : error && products.length === 0 ? (
        <EmptyState preset="offline" ctaLabel="Újra" onCtaPress={loadProducts} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          preset={searchQuery.trim() || activeCategory !== 'Összes' ? 'noResults' : 'emptyList'}
          ctaLabel={searchQuery.trim() || activeCategory !== 'Összes' ? undefined : 'Termék hozzáadása'}
          onCtaPress={
            searchQuery.trim() || activeCategory !== 'Összes'
              ? undefined
              : () => router.push('/termekek/uj')
          }
        />
      ) : (
        <FlatList
          key={viewMode}
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          contentContainerStyle={viewMode === 'grid'
            ? { paddingHorizontal: PADDING, paddingTop: 12, paddingBottom: 100, gap: GRID_GAP }
            : { paddingBottom: 100 }}
          columnWrapperStyle={viewMode === 'grid' ? { gap: GRID_GAP } : undefined}
        />
      )}

      {/* FAB */}
      <Pressable
        className="absolute bottom-6 right-5 w-14 h-14 rounded-fab bg-primary items-center justify-center"
        style={styles.fab}
        onPress={() => router.push('/termekek/uj')}
      >
        <Plus size={26} color={colors.card} strokeWidth={2.2} />
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  pressed: { opacity: 0.75 },
  fab: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
})
