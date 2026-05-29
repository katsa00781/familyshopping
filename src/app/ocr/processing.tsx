import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AlertTriangle } from 'lucide-react-native'

import { sendOCRRequest } from '@/lib/ocr'
import { findMatchingProduct } from '@/lib/productMatcher'
import { useOcrStore } from '@/store/ocrStore'
import { useProductStore } from '@/store/productStore'

type Step = 0 | 1 | 2

const STEPS: string[] = ['Kép', 'Szöveg', 'Tételek']

export default function OCRProcessingScreen() {
  const insets = useSafeAreaInsets()
  const capturedImageUri = useOcrStore((s) => s.capturedImageUri)
  const setOcrResponse = useOcrStore((s) => s.setOcrResponse)
  const products = useProductStore((s) => s.products)

  const [currentStep, setCurrentStep] = useState<Step>(0)
  const [error, setError] = useState<string | null>(null)
  const scanAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!capturedImageUri) {
      router.replace('/ocr')
      return
    }

    const loop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    loop.start()

    void runOCR()

    return () => loop.stop()
  }, [])

  async function runOCR() {
    try {
      setCurrentStep(0)
      await new Promise((r) => setTimeout(r, 400))

      setCurrentStep(1)
      const response = await sendOCRRequest(capturedImageUri ?? '')

      setCurrentStep(2)
      await new Promise((r) => setTimeout(r, 300))

      const existingProductIds: Record<string, string | null> = {}
      const matchedProductNames: Record<string, string | null> = {}
      for (const item of response.items) {
        const match = findMatchingProduct(item.name, null, products)
        if (match) {
          existingProductIds[item.name] = match.id
          matchedProductNames[item.name] = match.name
        }
      }

      setOcrResponse(response, existingProductIds, matchedProductNames)
      router.push('/ocr/review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nem sikerült olvasni a blokkot.')
    }
  }

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 380],
  })

  if (error) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <AlertTriangle size={48} color="#F59E0B" />
        <Text style={styles.errorTitle}>Nem sikerült olvasni a blokkot.</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <View style={styles.errorActions}>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              setError(null)
              void runOCR()
            }}
            accessibilityLabel="Újrapróbálás"
          >
            <Text style={styles.retryText}>Újrapróbálás</Text>
          </Pressable>
          <Pressable
            style={styles.manualBtn}
            onPress={() => router.push('/ocr/review')}
            accessibilityLabel="Kézi bevitel"
          >
            <Text style={styles.manualText}>Kézi bevitel</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Receipt thumbnail with scanner */}
      <View style={styles.receiptWrapper}>
        {capturedImageUri ? (
          <Image source={{ uri: capturedImageUri }} style={styles.receipt} contentFit="cover" />
        ) : (
          <View style={styles.receipt} />
        )}
        <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
      </View>

      {/* Status */}
      <Text style={styles.statusText}>Blokk feldolgozása...</Text>

      {/* Step pip indicators */}
      <View style={styles.stepsRow}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.pip,
                i < currentStep && styles.pipDone,
                i === currentStep && styles.pipActive,
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                i === currentStep && styles.stepLabelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
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
    gap: 24,
    padding: 24,
  },
  receiptWrapper: {
    width: 280,
    height: 380,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    position: 'relative',
  },
  receipt: {
    width: '100%',
    height: '100%',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(37,99,235,0.8)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  pipDone: {
    backgroundColor: '#22C55E',
  },
  pipActive: {
    backgroundColor: '#2563EB',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  stepLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBody: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  errorActions: {
    gap: 12,
    width: '100%',
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  manualBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  manualText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
})
