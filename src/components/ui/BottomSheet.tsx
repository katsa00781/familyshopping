import type { ReactNode } from 'react'
import { useEffect } from 'react'
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
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

  useEffect(() => {
    translateY.value = visible
      ? withTiming(0, { duration: 300 })
      : withTiming(sheetH, { duration: 250 })
  }, [visible, sheetH, translateY])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

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
          {/* Drag handle */}
          <View
            style={[
              styles.handle,
              { backgroundColor: dark ? '#334155' : '#CBD5E1' },
            ]}
          />

          {/* Title */}
          {title && (
            <Text className="text-heading-md text-foreground dark:text-dark-foreground text-center mb-4">
              {title}
            </Text>
          )}

          {children}
        </Animated.View>
      </View>
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
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
})
