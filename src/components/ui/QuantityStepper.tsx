import { Pressable, Text, View } from 'react-native'
import { Minus, Plus } from 'lucide-react-native'

import { colors } from '@/constants/colors'
import { formatHuNumber } from '@/lib/format'
import { haptics } from '@/lib/haptics'

interface QuantityStepperProps {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}

// Lebegőpontos hibák (0.1 + 0.2) kiszűrése: 2 tizedesre kerekítünk.
function roundQty(n: number): number {
  return Math.round(n * 100) / 100
}

function formatQty(n: number): string {
  return Number.isInteger(n) ? formatHuNumber(n) : n.toLocaleString('hu-HU')
}

export function QuantityStepper({ label, value, step, onChange }: QuantityStepperProps) {
  const canDecrease = value - step >= step - 1e-9

  function change(delta: number) {
    const next = roundQty(value + delta)
    if (next < step - 1e-9) return
    haptics.selection()
    onChange(next)
  }

  return (
    <View>
      <Text className="text-body-sm font-medium text-muted mb-1.5">{label}</Text>
      <View className="h-tap rounded-[10px] flex-row items-center border border-border dark:border-dark-border bg-card dark:bg-dark-card">
        <Pressable
          onPress={() => change(-step)}
          disabled={!canDecrease}
          accessibilityRole="button"
          accessibilityLabel="Mennyiség csökkentése"
          hitSlop={{ top: 4, bottom: 4 }}
        >
          {({ pressed }) => (
            <View
              className="w-tap h-tap items-center justify-center"
              style={{ opacity: !canDecrease ? 0.3 : pressed ? 0.6 : 1 }}
            >
              <Minus size={20} color={colors.primary} strokeWidth={1.75} />
            </View>
          )}
        </Pressable>

        <Text
          className="flex-1 text-center text-[17px] font-semibold text-foreground dark:text-dark-foreground"
          accessibilityLabel={`Mennyiség: ${formatQty(value)}`}
        >
          {formatQty(value)}
        </Text>

        <Pressable
          onPress={() => change(step)}
          accessibilityRole="button"
          accessibilityLabel="Mennyiség növelése"
          hitSlop={{ top: 4, bottom: 4 }}
        >
          {({ pressed }) => (
            <View
              className="w-tap h-tap items-center justify-center"
              style={{ opacity: pressed ? 0.6 : 1 }}
            >
              <Plus size={20} color={colors.primary} strokeWidth={1.75} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  )
}
