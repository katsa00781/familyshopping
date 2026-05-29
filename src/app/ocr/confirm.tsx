import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useOcrStore } from '@/store/ocrStore'
import { haptics } from '@/lib/haptics'

export default function OCRConfirmScreen() {
  const insets = useSafeAreaInsets()
  const { itemCount, newProductCount, storeName } = useLocalSearchParams<{
    itemCount: string
    newProductCount: string
    storeName: string
  }>()
  const reset = useOcrStore((s) => s.reset)

  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    haptics.success()
    Animated.spring(scale, {
      toValue: 1,
      damping: 14,
      stiffness: 200,
      useNativeDriver: true,
    }).start()
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [])

  function handleGoBack() {
    reset()
    router.dismissAll()
  }

  function handleScanNew() {
    reset()
    router.replace('/ocr')
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      {/* Green check with rings */}
      <Animated.View style={[styles.checkWrapper, { transform: [{ scale }], opacity }]}>
        <View style={styles.ring3}>
          <View style={styles.ring2}>
            <View style={styles.ring1}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      <Text style={styles.title}>Sikeres mentés</Text>

      {/* Receipt */}
      <View style={styles.receipt}>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptDot}>•</Text>
          <Text style={styles.receiptText}>{itemCount ?? '0'} ár rögzítve</Text>
        </View>
        {parseInt(newProductCount ?? '0', 10) > 0 && (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptDot}>•</Text>
            <Text style={styles.receiptText}>
              {newProductCount} új termék létrehozva
            </Text>
          </View>
        )}
        {!!storeName && (
          <View style={styles.receiptRow}>
            <Text style={styles.receiptDot}>•</Text>
            <Text style={styles.receiptText}>Bolt: {storeName}</Text>
          </View>
        )}
      </View>

      {/* CTAs */}
      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={handleGoBack} accessibilityLabel="Vissza">
          <Text style={styles.primaryText}>Vissza</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={handleScanNew} accessibilityLabel="Új blokk beolvasása">
          <Text style={styles.secondaryText}>Új blokk beolvasása</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  checkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring3: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(34,197,94,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring2: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring1: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(34,197,94,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  receipt: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    width: '100%',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  receiptDot: {
    color: '#22C55E',
    fontSize: 16,
    lineHeight: 22,
  },
  receiptText: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
  },
})
