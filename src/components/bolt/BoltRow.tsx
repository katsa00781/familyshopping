import { Text, View } from 'react-native'
import BoltCheckbox from './BoltCheckbox'
import { colors } from '@/constants/colors'
import { formatHuf } from '@/lib/format'
import type { ShoppingItem } from '@/types'

interface Props {
  item: ShoppingItem
  onToggle: () => void
}

export default function BoltRow({ item, onToggle }: Props) {
  return (
    <View
      style={{
        height: 72,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        opacity: item.checked ? 0.4 : 1,
      }}
    >
      <BoltCheckbox checked={item.checked} onToggle={onToggle} />

      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 24,
            lineHeight: 30,
            fontWeight: '600',
            color: colors.darkForeground,
            textDecorationLine: item.checked ? 'line-through' : 'none',
          }}
        >
          {item.name}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
        {item.price != null && (
          <Text style={{ fontSize: 15, lineHeight: 20, color: colors.muted, fontWeight: '500' }}>
            {formatHuf(item.price)}
          </Text>
        )}
        <Text style={{ fontSize: 13, lineHeight: 18, color: '#475569' }}>
          {item.quantity} {item.unit}
        </Text>
      </View>
    </View>
  )
}
