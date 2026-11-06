import { Pressable, Text, View } from 'react-native'
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native'

import { colors } from '@/constants/colors'
import { haptics } from '@/lib/haptics'

interface SelectProps<T extends string> {
  label: string
  value: T
  options: readonly T[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: T) => void
}

/**
 * Lenyíló választó (select). A lista a mező alatt nyílik ki – nem nyit külön
 * modalt, így BottomSheet-en belül is biztonságosan használható.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  open,
  onOpenChange,
  onChange,
}: SelectProps<T>) {
  const Chevron = open ? ChevronUp : ChevronDown

  return (
    <View>
      <Text className="text-body-sm font-medium text-muted mb-1.5">{label}</Text>
      <Pressable
        onPress={() => onOpenChange(!open)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ expanded: open }}
      >
        {({ pressed }) => (
          <View
            className={`h-tap rounded-[10px] px-3 flex-row items-center border bg-card dark:bg-dark-card ${
              open ? 'border-primary' : 'border-border dark:border-dark-border'
            }`}
            style={{ opacity: pressed ? 0.7 : 1 }}
          >
            <Text
              className="flex-1 text-[17px] text-foreground dark:text-dark-foreground"
              numberOfLines={1}
            >
              {value}
            </Text>
            <Chevron size={18} color={colors.muted} strokeWidth={1.75} />
          </View>
        )}
      </Pressable>

      {open && (
        <View className="mt-1 rounded-[10px] overflow-hidden border border-border dark:border-dark-border bg-card dark:bg-dark-card">
          {options.map((option, index) => {
            const selected = option === value
            return (
              <Pressable
                key={option}
                onPress={() => {
                  haptics.selection()
                  onChange(option)
                  onOpenChange(false)
                }}
                accessibilityRole="button"
                accessibilityLabel={option}
                accessibilityState={{ selected }}
              >
                {({ pressed }) => (
                  <View
                    className={`h-tap px-3 flex-row items-center ${
                      index > 0 ? 'border-t border-border dark:border-dark-border' : ''
                    } ${selected ? 'bg-surface-muted dark:bg-dark-border' : ''}`}
                    style={{ opacity: pressed ? 0.6 : 1 }}
                  >
                    <Text
                      className={`flex-1 text-body-lg ${
                        selected
                          ? 'text-primary font-semibold'
                          : 'text-foreground dark:text-dark-foreground'
                      }`}
                    >
                      {option}
                    </Text>
                    {selected && <Check size={18} color={colors.primary} strokeWidth={1.75} />}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}
