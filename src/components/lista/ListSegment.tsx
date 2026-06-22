import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

export type ListSegmentKey = 'listak' | 'termekek' | 'arak'

interface SegmentItem {
  key: ListSegmentKey
  label: string
}

const SEGMENT_ROUTES = {
  listak: '/(tabs)/bevasarlas',
  termekek: '/(tabs)/termekek',
  arak: '/(tabs)/arak',
} as const

/**
 * Közös szegmens-navigáció a Bevásárlás aldnézetei közt (Listák / Termékek / Árak).
 * `navigate` (nem `push`), hogy ne épüljön fel duplikált back-stack a váltogatásnál.
 */
export function useSegmentNav(current: ListSegmentKey) {
  const router = useRouter()
  return (key: ListSegmentKey) => {
    if (key === current) return
    router.navigate(SEGMENT_ROUTES[key])
  }
}

interface Props {
  active: ListSegmentKey
  onSelect: (key: ListSegmentKey) => void
}

const ITEMS: SegmentItem[] = [
  { key: 'listak', label: 'Listák' },
  { key: 'termekek', label: 'Termékek' },
  { key: 'arak', label: 'Árak' },
]

export function ListSegment({ active, onSelect }: Props) {
  return (
    <View
      className="flex-row bg-surface-sunken"
      style={{ marginTop: 16, padding: 5, borderRadius: 16, gap: 8 }}
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
            className="flex-1"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              className={isActive ? 'bg-card' : ''}
              style={{
                paddingVertical: 9,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                ...(isActive
                  ? {
                      shadowColor: '#1C2B2A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 6,
                      elevation: 2,
                    }
                  : {}),
              }}
            >
              <Text
                className={isActive ? 'text-foreground dark:text-dark-foreground' : 'text-muted'}
                style={{ fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 }}
              >
                {item.label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
