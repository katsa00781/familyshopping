import { router } from 'expo-router'
import { RotateCw } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useOcrStore } from '@/store/ocrStore'

export default function OCRPreviewScreen() {
  const insets = useSafeAreaInsets()
  const capturedImageUri = useOcrStore((s) => s.capturedImageUri)

  useEffect(() => {
    if (!capturedImageUri) router.replace('/ocr')
  }, [capturedImageUri])

  if (!capturedImageUri) return null

  return (
    <View style={styles.container}>
      <Image source={{ uri: capturedImageUri }} style={StyleSheet.absoluteFill} contentFit="contain" />

      {/* Glass actions */}
      <View style={[styles.topActions, { top: insets.top + 8 }]}>
        <Pressable style={styles.glassBtn} accessibilityLabel="Forgatás" hitSlop={8}>
          <RotateCw size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Bottom CTAs */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.replace('/ocr')}
          accessibilityLabel="Újrafotózás"
        >
          <Text style={styles.secondaryText}>Újrafotózás</Text>
        </Pressable>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push('/ocr/processing')}
          accessibilityLabel="Tovább"
        >
          <Text style={styles.primaryText}>Tovább →</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topActions: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  primaryBtn: {
    flex: 1.4,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})
