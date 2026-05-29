import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { X, Zap, ZapOff, Image } from 'lucide-react-native'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useOcrStore } from '@/store/ocrStore'

export default function OCRCameraScreen() {
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [flash, setFlash] = useState<'off' | 'on'>('off')
  const [capturing, setCapturing] = useState(false)
  const cameraRef = useRef<CameraView>(null)
  const setCapturedImage = useOcrStore((s) => s.setCapturedImage)

  async function handleGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })
    if (!result.canceled && result.assets[0]?.uri) {
      setCapturedImage(result.assets[0].uri)
      router.push('/ocr/preview')
    }
  }

  async function handleCapture() {
    if (!cameraRef.current || capturing) return
    setCapturing(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.8 })
      if (photo?.uri) {
        setCapturedImage(photo.uri)
        router.push('/ocr/preview')
      }
    } finally {
      setCapturing(false)
    }
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#fff" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Pressable
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Bezárás"
        >
          <X size={24} color="#fff" />
        </Pressable>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Kamera-hozzáférés szükséges</Text>
          <Text style={styles.permissionBody}>
            A blokk beolvasásához engedélyezd a kamera-hozzáférést a beállításokban.
          </Text>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => Linking.openSettings()}
            accessibilityLabel="Megnyitás a beállításokban"
          >
            <Text style={styles.settingsBtnText}>Engedélyezés a beállításokban</Text>
          </Pressable>
          <Pressable onPress={requestPermission} style={styles.tryAgainBtn}>
            <Text style={styles.tryAgainText}>Engedély kérése</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} enableTorch={flash === 'on'} />

      {/* Close */}
      <Pressable
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityLabel="Bezárás"
      >
        <X size={24} color="#fff" />
      </Pressable>

      {/* Alignment frame */}
      <View style={styles.frameWrapper} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <Text style={styles.hint}>Helyezd a blokkot a keretbe</Text>
      </View>

      {/* Bottom controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={styles.sideBtn}
          onPress={handleGallery}
          accessibilityLabel="Galéria"
          hitSlop={8}
        >
          <Image size={28} color="#fff" />
        </Pressable>

        <Pressable
          style={[styles.shutter, capturing && styles.shutterCapturing]}
          onPress={handleCapture}
          disabled={capturing}
          accessibilityLabel="Fénykép"
        >
          {capturing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>

        <Pressable
          style={styles.sideBtn}
          onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
          accessibilityLabel="Vaku kapcsoló"
          hitSlop={8}
        >
          {flash === 'on' ? (
            <Zap size={28} color="#FCD34D" />
          ) : (
            <ZapOff size={28} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  )
}

const CORNER = 20
const CORNER_THICKNESS = 3

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 320,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#FCD34D',
  },
  tl: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  tr: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  bl: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  br: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  hint: {
    marginTop: 16,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  sideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterCapturing: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionBody: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  settingsBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  tryAgainBtn: {
    paddingVertical: 10,
  },
  tryAgainText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
})
