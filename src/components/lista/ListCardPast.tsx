import { Pressable, Text, View } from 'react-native'
import { Check, MoreHorizontal } from 'lucide-react-native'

import { colors } from '@/constants/colors'
import { formatHuf, formatHuDate } from '@/lib/format'
import type { ShoppingList } from '@/types'

interface Props {
  list: ShoppingList
  onPress: () => void
  onMenu: () => void
  /** Hosszú nyomás – a képernyő ezzel indítja a kijelölő módot. */
  onLongPress?: () => void
  /** Kijelölő mód: a pipa-ikon helyén kijelölő kör, a menü rejtve. */
  selectable?: boolean
  selected?: boolean
}

const cardShadow = {
  shadowColor: colors.foreground,
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
}

export function ListCardPast({ list, onPress, onMenu, onLongPress, selectable = false, selected = false }: Props) {
  const dateStr = formatHuDate(list.completed_at ?? list.date)

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked: selected } : undefined}
      accessibilityLabel={`${list.name}, befejezve, ${formatHuf(list.total_amount)}`}
      accessibilityHint={selectable ? 'Kijelölés be- vagy kikapcsolása' : undefined}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <View
        style={[cardShadow, { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 18, gap: 12 }]}
        // Kijelölő módban mindig 2 pt keret (átlátszó/teal), hogy a kijelölés ne ugrassa a tartalmat.
        className={`flex-row items-center bg-card dark:bg-dark-card ${
          !selectable
            ? 'dark:border dark:border-dark-border'
            : selected
              ? 'border-2 border-primary'
              : 'border-2 border-transparent dark:border-dark-border'
        }`}
      >
        {selectable ? (
          <View style={{ width: 38, height: 38 }} className="items-center justify-center">
            <View
              className={`items-center justify-center ${
                selected ? 'bg-primary' : 'border-2 border-border dark:border-dark-border'
              }`}
              style={{ width: 26, height: 26, borderRadius: 13 }}
            >
              {selected ? <Check size={16} color={colors.primaryForeground} strokeWidth={2.8} /> : null}
            </View>
          </View>
        ) : (
          <View
            className="items-center justify-center bg-surface-muted dark:bg-dark-border"
            style={{ width: 38, height: 38, borderRadius: 12 }}
          >
            <Check size={19} color={colors.muted} strokeWidth={1.9} />
          </View>
        )}

        <View className="flex-1">
          <Text
            className="text-foreground dark:text-dark-foreground"
            style={{ fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 }}
            numberOfLines={1}
          >
            {list.name}
          </Text>
          <Text className="text-muted" style={{ fontSize: 12.5, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
            <Text className="text-success" style={{ fontWeight: '600' }}>
              Befejezve
            </Text>
            {` · ${dateStr} · ${list.items.length} tétel`}
          </Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Text
            className="text-foreground dark:text-dark-foreground"
            style={{ fontSize: 14, fontWeight: '800', letterSpacing: -0.2, fontVariant: ['tabular-nums'] }}
          >
            {formatHuf(list.total_amount)}
          </Text>
          {selectable ? null : (
            <Pressable
              onPress={onMenu}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Műveletek"
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
            >
              <MoreHorizontal size={20} color={colors.muted} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  )
}
