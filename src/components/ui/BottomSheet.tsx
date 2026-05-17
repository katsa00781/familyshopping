import type { ReactNode } from 'react'
import { useEffect } from 'react'
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const SCREEN_H = Dimensions.get('window').height

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  variant?: 'half' | 'full'
  children: ReactNode
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  variant = 'half',
  children,
}: BottomSheetProps) {
  const dark = useColorScheme() === 'dark'
  const sheetH = variant === 'full' ? SCREEN_H * 0.88 : SCREEN_H * 0.5
  const translateY = useSharedValue(sheetH)
  const dragY = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      dragY.value = 0
      translateY.value = withTiming(0, { duration: 300 })
    } else {
      translateY.value = withTiming(sheetH, { duration: 250 })
    }
  }, [visible, sheetH, translateY, dragY])

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        dragY.value = e.translationY
      }
    })
    .onEnd((e) => {
      const shouldDismiss = e.velocityY > 800 || dragY.value > sheetH * 0.3
      if (shouldDismiss) {
        dragY.value = withTiming(sheetH, { duration: 250 })
        runOnJS(onClose)()
      } else {
        dragY.value = withTiming(0, { duration: 200 })
      }
    })

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }],
  }))

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        {/* Sheet panel */}
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              height: sheetH,
              backgroundColor: dark ? '#1E293B' : '#FFFFFF',
            },
          ]}
        >
          {/* Drag handle – gesture target */}
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: dark ? '#334155' : '#CBD5E1' },
                ]}
              />
              {title && (
                <Text className="text-heading-md text-foreground dark:text-dark-foreground text-center mb-4">
                  {title}
                </Text>
              )}
            </View>
          </GestureDetector>

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 34,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.20,
    shadowRadius: 30,
    elevation: 24,
  },
  handleArea: {
    paddingTop: 0,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
})
