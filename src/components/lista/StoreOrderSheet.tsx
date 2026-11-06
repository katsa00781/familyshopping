import { Pressable, ScrollView, Text, View } from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'
import { ChevronDown, ChevronUp } from 'lucide-react-native'

import BottomSheet from '@/components/ui/BottomSheet'
import { colors } from '@/constants/colors'
import { haptics } from '@/lib/haptics'
import { orderedStoreNames } from '@/lib/sortByStore'
import { useProductStore } from '@/store/productStore'
import { useStoreOrderStore } from '@/store/storeOrderStore'

interface StoreOrderSheetProps {
  visible: boolean
  onClose: () => void
}

const ROW_LAYOUT = LinearTransition.springify().damping(18).stiffness(220)

export function StoreOrderSheet({ visible, onClose }: StoreOrderSheetProps) {
  const products = useProductStore((s) => s.products)
  const order = useStoreOrderStore((s) => s.order)
  const setOrder = useStoreOrderStore((s) => s.setOrder)

  const stores = orderedStoreNames(products, order)

  function move(index: number, delta: -1 | 1) {
    const target = index + delta
    const current = stores[index]
    const other = stores[target]
    if (current === undefined || other === undefined) return
    const next = [...stores]
    next[index] = other
    next[target] = current
    haptics.selection()
    setOrder(next)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Boltok sorrendje">
      <Text className="text-body-sm text-muted mb-3 text-center">
        A lista ebben a sorrendben csoportosítja a tételeket.
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {stores.length === 0 ? (
          <Text className="text-body-md text-muted text-center py-8">
            Még nincs bolthoz rendelt termék
          </Text>
        ) : (
          <View className="rounded-[20px] overflow-hidden border border-border dark:border-dark-border bg-card dark:bg-dark-card">
            {stores.map((store, index) => (
              <Animated.View key={store} layout={ROW_LAYOUT}>
                <View
                  className={`flex-row items-center pl-4 pr-1 h-row ${
                    index > 0 ? 'border-t border-border dark:border-dark-border' : ''
                  }`}
                >
                  <Text className="w-7 text-body-md font-semibold text-muted">{index + 1}.</Text>
                  <Text
                    className="flex-1 text-body-lg text-foreground dark:text-dark-foreground"
                    numberOfLines={1}
                  >
                    {store}
                  </Text>
                  <OrderButton
                    direction="up"
                    disabled={index === 0}
                    label={`${store} feljebb`}
                    onPress={() => move(index, -1)}
                  />
                  <OrderButton
                    direction="down"
                    disabled={index === stores.length - 1}
                    label={`${store} lejjebb`}
                    onPress={() => move(index, 1)}
                  />
                </View>
              </Animated.View>
            ))}
          </View>
        )}
        <Text className="text-body-sm text-muted mt-3 mb-6 text-center">
          A bolt nélküli tételek mindig a lista végére kerülnek.
        </Text>
      </ScrollView>
    </BottomSheet>
  )
}

interface OrderButtonProps {
  direction: 'up' | 'down'
  disabled: boolean
  label: string
  onPress: () => void
}

function OrderButton({ direction, disabled, label, onPress }: OrderButtonProps) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      {({ pressed }) => (
        <View
          className="w-tap h-tap items-center justify-center"
          style={{ opacity: disabled ? 0.25 : pressed ? 0.6 : 1 }}
        >
          <Icon size={22} color={colors.primary} strokeWidth={1.75} />
        </View>
      )}
    </Pressable>
  )
}
