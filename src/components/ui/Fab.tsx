import { Pressable } from 'react-native'
import { Plus } from 'lucide-react-native'

import { colors } from '@/constants/colors'

interface FabProps {
  onPress: () => void
  accessibilityLabel: string
  /**
   * `floating` (alap): a képernyő jobb alsó sarkában lebeg (abszolút pozíció).
   * `inline`: a hívó pozicionálja (pl. animált, görgetésre elrejtett wrapperben).
   */
  position?: 'floating' | 'inline'
}

/**
 * Egységes „+" lebegő akciógomb (új elem felvétele): fő szín (teal), 58 pt kör,
 * teal árnyék. A style SZÁNDÉKOSAN objektum-formájú: NativeWind v4 alatt a Pressable
 * függvény-style-jának statikus property-jei (position, méret) eldobódhatnak.
 */
export function Fab({ onPress, accessibilityLabel, position = 'floating' }: FabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        position === 'floating' ? { position: 'absolute', right: 20, bottom: 24 } : null,
        {
          width: 58,
          height: 58,
          borderRadius: 99,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.45,
          shadowRadius: 22,
          elevation: 8,
        },
      ]}
    >
      <Plus size={26} color={colors.primaryForeground} strokeWidth={2.6} />
    </Pressable>
  )
}
