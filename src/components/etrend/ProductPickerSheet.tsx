import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { PackageSearch, Search, Tag, X } from 'lucide-react-native'

import { formatHuf } from '@/lib/format'
import { colors } from '@/constants/colors'
import type { Product } from '@/types'

interface ProductPickerSheetProps {
  visible: boolean
  products: Product[]
  title?: string
  onClose: () => void
  onPick: (product: Product) => void
}

export function ProductPickerSheet({
  visible,
  products,
  title = 'Termék kiválasztása',
  onClose,
  onPick,
}: ProductPickerSheetProps) {
  const dark = useColorScheme() === 'dark'
  const [query, setQuery] = useState('')

  const translateY = useSharedValue(900)
  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 900, { duration: visible ? 300 : 250 })
    if (visible) setQuery('')
  }, [visible, translateY])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground
  const sunken = dark ? colors.darkBackground : '#F4F2ED'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name, 'hu'))
    if (!q) return sorted
    return sorted.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.brand?.toLowerCase().includes(q) ?? false),
    )
  }, [products, query])

  function handlePick(p: Product) {
    onPick(p)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        <Animated.View
          className="bg-background dark:bg-dark-background"
          style={[{ height: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, sheetStyle]}
        >
          <View style={{ paddingTop: 10, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: dark ? colors.darkBorder : '#D7D3CA' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.3, flex: 1 }} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="Bezárás" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
              <X size={17} color={fg} strokeWidth={2.6} />
            </Pressable>
          </View>

          {/* Kereső */}
          <View style={{ marginHorizontal: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg }}>
            <Search size={18} color={colors.muted} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Termék keresése…"
              placeholderTextColor="#C2C6C4"
              autoCorrect={false}
              style={{ flex: 1, color: fg, fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2 }}
            />
          </View>

          {filtered.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.10)', marginBottom: 4 }}>
                <PackageSearch size={30} color={colors.primary} strokeWidth={1.75} />
              </View>
              <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                {products.length === 0 ? 'Nincs még terméked' : 'Nincs találat'}
              </Text>
              <Text className="text-muted" style={{ fontSize: 13.5, fontWeight: '600', textAlign: 'center' }}>
                {products.length === 0
                  ? 'A Termékek nézetben felvett tételek itt jelennek meg, áraikkal együtt.'
                  : 'Próbálj más keresőszót.'}
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filtered.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => handlePick(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name} kiválasztása`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: sunken }}>
                      <Tag size={20} color={colors.muted} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text className="text-foreground dark:text-dark-foreground" numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}>
                        {p.name}
                      </Text>
                      <Text className="text-muted" numberOfLines={1} style={{ marginTop: 2, fontSize: 12.5, fontWeight: '700' }}>
                        {[p.brand, p.unit].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: p.price != null ? fg : colors.muted }}>
                      {p.price != null ? formatHuf(p.price) : '—'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}
