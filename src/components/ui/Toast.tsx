import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { CheckCircle, Info, X, XCircle } from 'lucide-react-native'

type ToastKind = 'success' | 'error' | 'info'

interface ToastProps {
  kind: ToastKind
  message: string
  onDismiss?: () => void
}

const ACCENT: Record<ToastKind, string> = {
  success: '#22C55E',
  error:   '#EF4444',
  info:    '#2563EB',
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  const color = ACCENT[kind]
  if (kind === 'success') return <CheckCircle size={14} strokeWidth={2.5} color={color} />
  if (kind === 'error')   return <XCircle     size={14} strokeWidth={2.5} color={color} />
  return                         <Info        size={14} strokeWidth={2.5} color={color} />
}

export default function Toast({ kind, message, onDismiss }: ToastProps) {
  const dark = useColorScheme() === 'dark'
  const accent = ACCENT[kind]

  return (
    <View
      className="flex-row items-center gap-3 rounded-card bg-card dark:bg-dark-card"
      style={[
        styles.shadow,
        {
          height: 56,
          paddingLeft: 12,
          paddingRight: 14,
          borderWidth: 1,
          borderColor: dark ? '#334155' : '#E2E8F0',
          borderLeftWidth: 4,
          borderLeftColor: accent,
        },
      ]}
    >
      {/* Colored icon circle */}
      <View
        className="w-7 h-7 rounded-full items-center justify-center"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <ToastIcon kind={kind} />
      </View>

      {/* Message */}
      <Text className="flex-1 text-[15px] leading-5 font-medium text-foreground dark:text-dark-foreground">
        {message}
      </Text>

      {/* Dismiss */}
      {onDismiss && (
        <Pressable
          className="w-6 h-6 items-center justify-center"
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          onPress={onDismiss}
          hitSlop={4}
        >
          <X size={16} strokeWidth={2} color="#94A3B8" />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: { opacity: 0.75 },
})
