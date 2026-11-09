import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Image } from 'expo-image'
import { ImageOff } from 'lucide-react-native'

import { getTaskPhotoUrl } from '@/lib/tasks'
import { colors } from '@/constants/colors'

interface TaskPhotoProps {
  /** Storage útvonal (`photo_path`). */
  path: string | null
  /** Helyi URI (frissen kiválasztott / feltöltés alatt álló kép) – elsőbbséget élvez. */
  localUri?: string | null
  size: number | 'fill'
  radius?: number
  contentFit?: 'cover' | 'contain'
}

/** Feladat-fotó: helyi URI vagy a privát bucketből aláírt URL-lel betöltött kép. */
export function TaskPhoto({ path, localUri, size, radius = 12, contentFit = 'cover' }: TaskPhotoProps) {
  // Az aláírt URL az útvonalhoz kötve: útvonal-váltáskor a régi kép nem villan fel.
  const [remote, setRemote] = useState<{ path: string; url: string | null } | null>(null)

  useEffect(() => {
    if (localUri || !path) return
    let cancelled = false
    void getTaskPhotoUrl(path).then((url) => {
      if (!cancelled) setRemote({ path, url })
    })
    return () => {
      cancelled = true
    }
  }, [path, localUri])

  const resolved = remote !== null && remote.path === path
  const uri = localUri ?? (resolved ? remote.url : null)
  const failed = !localUri && resolved && remote.url === null
  const box = size === 'fill' ? { flex: 1, alignSelf: 'stretch' as const } : { width: size, height: size }

  return (
    <View className="bg-surface-sunken dark:bg-dark-border" style={[box, { borderRadius: radius, overflow: 'hidden' }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit={contentFit}
          transition={120}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {failed ? (
            <ImageOff size={18} color={colors.muted} strokeWidth={1.75} />
          ) : (
            <ActivityIndicator size="small" color={colors.muted} />
          )}
        </View>
      )}
    </View>
  )
}
