import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: Variant
  size?: Size
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  square?: boolean
  leftIcon?: ReactNode
  onPress?: () => void
  children?: ReactNode
}

const HEIGHT: Record<Size, string> = { sm: 'h-9', md: 'h-tap', lg: 'h-cta' }
const PADDING: Record<Size, string> = { sm: 'px-4', md: 'px-5', lg: 'px-6' }
const SQ_WIDTH: Record<Size, string> = { sm: 'w-9', md: 'w-tap', lg: 'w-cta' }
const GAP: Record<Size, string> = { sm: 'gap-1.5', md: 'gap-2', lg: 'gap-2' }
const TEXT_SIZE: Record<Size, string> = {
  sm: 'text-[13px] leading-[18px]',
  md: 'text-[15px] leading-5',
  lg: 'text-[17px] leading-[22px]',
}
const BG: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-[#F1F5F9] dark:bg-[#334155]',
  ghost: 'bg-transparent',
  destructive: 'bg-destructive',
}
const FG: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-foreground dark:text-dark-foreground',
  ghost: 'text-primary',
  destructive: 'text-white',
}
const SPINNER_COLOR: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: '#0F172A',
  ghost: '#2563EB',
  destructive: '#FFFFFF',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  square = false,
  leftIcon,
  onPress,
  children,
}: ButtonProps) {
  const isOff = disabled || loading
  const wClass = square ? SQ_WIDTH[size] : fullWidth ? 'w-full' : 'self-start'
  const pxClass = square ? '' : PADDING[size]
  const gapClass = leftIcon && !square ? GAP[size] : ''

  const cls = [
    HEIGHT[size],
    wClass,
    pxClass,
    gapClass,
    'rounded-button flex-row items-center justify-center',
    BG[variant],
    isOff ? 'opacity-40' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      className={cls}
      style={({ pressed }) => (!isOff && pressed ? styles.pressed : undefined)}
    >
      {loading ? (
        <ActivityIndicator size="small" color={SPINNER_COLOR[variant]} />
      ) : (
        <>
          {leftIcon}
          {!square && (
            <Text className={`${TEXT_SIZE[size]} font-semibold ${FG[variant]}`}>
              {children}
            </Text>
          )}
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
})
