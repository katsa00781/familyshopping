import { Pressable, Text, View } from 'react-native'

interface MemberAvatarProps {
  name: string
  color: string
  size?: number
  onPress?: () => void
  accessibilityLabel?: string
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0]![0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? '') : ''
  return (first + last).toUpperCase()
}

/**
 * Kör avatar 2 pt-es tagszínes gyűrűvel (FamilyWall aláírás-elem).
 * A gyűrűt a külső border + a háttérrel egyező rés adja, belül a tagszínnel
 * kitöltött kör a monogrammal.
 */
export function MemberAvatar({
  name,
  color,
  size = 44,
  onPress,
  accessibilityLabel,
}: MemberAvatarProps) {
  const inner = size - 8 // 2 pt gyűrű + 2 pt rés mindkét oldalon

  const content = (
    <View
      className="items-center justify-center rounded-full bg-background dark:bg-dark-background"
      style={{ width: size, height: size, borderWidth: 2, borderColor: color }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: inner, height: inner, backgroundColor: color }}
      >
        <Text className="text-white font-bold" style={{ fontSize: size * 0.34, lineHeight: size * 0.42 }}>
          {getInitials(name)}
        </Text>
      </View>
    </View>
  )

  if (!onPress) return content

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  )
}
