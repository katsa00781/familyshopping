import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native'
import { Eye, EyeOff, Search } from 'lucide-react-native'

type InputType = 'text' | 'password' | 'search' | 'email' | 'number'

interface InputProps {
  label?: string
  value?: string
  onChangeText?: (text: string) => void
  placeholder?: string
  helper?: string
  error?: string
  suffix?: string
  type?: InputType
  disabled?: boolean
}

export default function Input({
  label,
  value = '',
  onChangeText,
  placeholder = '',
  helper,
  error,
  suffix,
  type = 'text',
  disabled = false,
}: InputProps) {
  const dark = useColorScheme() === 'dark'
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isError = !!error
  const borderColor = isError
    ? '#EF4444'
    : focused
      ? '#2563EB'
      : dark ? '#334155' : '#E2E8F0'
  const borderWidth = isError || focused ? 1.5 : 1

  const fieldBgClass = disabled
    ? 'bg-[#F8FAFC] dark:bg-dark-background'
    : 'bg-card dark:bg-dark-card'

  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-[13px] leading-[18px] font-medium text-[#475569] dark:text-muted">
          {label}
        </Text>
      )}
      <View
        className={`h-tap rounded-[10px] flex-row items-center px-3 gap-2 ${fieldBgClass} ${disabled ? 'opacity-[0.55]' : ''}`}
        style={{ borderWidth, borderColor }}
      >
        {type === 'search' && (
          <Search size={16} strokeWidth={2} color="#94A3B8" />
        )}
        <TextInput
          className={`flex-1 text-[17px] leading-[22px] text-foreground dark:text-dark-foreground p-0 ${type === 'password' ? 'pr-9' : ''}`}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={type === 'password' && !showPassword}
          keyboardType={type === 'number' ? 'numeric' : type === 'email' ? 'email-address' : 'default'}
          autoCapitalize={type === 'email' || type === 'password' ? 'none' : 'sentences'}
          autoCorrect={type !== 'email' && type !== 'password' && type !== 'search'}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {suffix && type !== 'password' && (
          <Text className="text-body-sm text-muted">{suffix}</Text>
        )}
        {type === 'password' && (
          <Pressable
            className="absolute right-3 top-0 bottom-0 w-11 items-center justify-center"
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={4}
          >
            {showPassword
              ? <EyeOff size={18} color="#94A3B8" />
              : <Eye size={18} color="#94A3B8" />}
          </Pressable>
        )}
      </View>
      {(error ?? helper) ? (
        <Text className={`text-[12px] leading-4 ${error ? 'text-destructive' : 'text-muted'}`}>
          {error ?? helper}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
})
