import { router } from 'expo-router'
import { Eye, EyeOff, ShoppingCart } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store/toastStore'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isNetworkError(msg: string): boolean {
  const m = msg.toLowerCase()
  return m.includes('fetch') || m.includes('network') || m.includes('offline')
}

export default function LoginScreen() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.showToast)

  const passwordRef = useRef<TextInput>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark = useSharedValue(dark ? 1 : 0)
  const emailFocus = useSharedValue(0)
  const emailHasErr = useSharedValue(0)
  const passwordFocus = useSharedValue(0)
  const emailShake = useSharedValue(0)

  useEffect(() => {
    isDark.value = dark ? 1 : 0
  }, [dark, isDark])

  useEffect(() => {
    emailHasErr.value = emailError ? 1 : 0
  }, [emailError, emailHasErr])

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  const emailContainerStyle = useAnimatedStyle(() => {
    const defaultColor = isDark.value === 1 ? '#334155' : '#E2E8F0'
    const borderColor =
      emailHasErr.value === 1
        ? '#EF4444'
        : interpolateColor(emailFocus.value, [0, 1], [defaultColor, '#2563EB'])
    return {
      borderColor,
      transform: [{ translateX: emailShake.value }],
    }
  })

  const passwordContainerStyle = useAnimatedStyle(() => {
    const defaultColor = isDark.value === 1 ? '#334155' : '#E2E8F0'
    return {
      borderColor: interpolateColor(passwordFocus.value, [0, 1], [defaultColor, '#2563EB']),
    }
  })

  const triggerShake = () => {
    emailShake.value = withSequence(
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    )
  }

  const handleEmailBlur = () => {
    emailFocus.value = withTiming(0, { duration: 120 })
    if (email.trim() && !isValidEmail(email.trim())) {
      blurTimer.current = setTimeout(() => setEmailError('Nem érvényes e-mail cím.'), 250)
    }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) return
    setLoading(true)
    setEmailError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setLoading(false)

      if (authError) {
        if (isNetworkError(authError.message)) {
          showToast('Nincs kapcsolat. Próbáld újra.', 'info')
        } else {
          showToast('Hibás e-mail vagy jelszó. Próbáld újra.', 'error')
          triggerShake()
        }
        return
      }

      router.replace('/(tabs)')
    } catch (err: unknown) {
      setLoading(false)
      const msg = err instanceof Error ? err.message : ''
      if (isNetworkError(msg)) {
        showToast('Nincs kapcsolat. Próbáld újra.', 'info')
      } else {
        showToast('Váratlan hiba. Próbáld újra.', 'error')
        triggerShake()
      }
    }
  }

  const isDisabled = email.trim().length < 1 || password.length < 1 || loading
  const card = dark ? '#1E293B' : '#FFFFFF'

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#0F172A' : '#F8FAFC' }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + Brand zone */}
          <View className="items-center mt-20 mb-14">
            <View style={styles.brandIcon}>
              <ShoppingCart size={32} color="#fff" strokeWidth={2} />
            </View>
            <Text style={[styles.brandName, { color: dark ? '#F8FAFC' : '#0F172A' }]}>FamilyShopping</Text>
          </View>

          {/* Heading */}
          <Text className="text-[28px] leading-[34px] font-bold text-slate-950 dark:text-slate-50 mt-1 mb-6">
            Üdvözöllek!
          </Text>

          {/* Form fields */}
          <View className="gap-5 mb-8">

            {/* Email */}
            <View className="gap-1.5">
              <Text className="text-[13px] leading-[18px] font-semibold text-slate-950 dark:text-slate-50">
                E-mail cím
              </Text>
              <Animated.View style={[styles.inputContainer, { backgroundColor: card }, emailContainerStyle]}>
                <TextInput
                  className="text-[17px] leading-[22px] text-slate-950 dark:text-slate-50 p-0"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t)
                    setEmailError(null)
                    if (blurTimer.current) clearTimeout(blurTimer.current)
                  }}
                  placeholder="janos@example.hu"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => { emailFocus.value = withTiming(1, { duration: 120 }) }}
                  onBlur={handleEmailBlur}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </Animated.View>
              {emailError && (
                <Text className="text-[13px] leading-[18px] text-red-500">{emailError}</Text>
              )}
            </View>

            {/* Password */}
            <View className="gap-1.5">
              <Text className="text-[13px] leading-[18px] font-semibold text-slate-950 dark:text-slate-50">
                Jelszó
              </Text>
              <Animated.View style={[styles.inputContainer, { backgroundColor: card }, passwordContainerStyle]}>
                <TextInput
                  ref={passwordRef}
                  className="text-[17px] leading-[22px] text-slate-950 dark:text-slate-50 p-0 pr-11"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onFocus={() => { passwordFocus.value = withTiming(1, { duration: 120 }) }}
                  onBlur={() => { passwordFocus.value = withTiming(0, { duration: 120 }) }}
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  className="absolute right-[14px] top-[15px]"
                  style={({ pressed }) => pressed ? styles.pressed : undefined}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  {showPassword
                    ? <EyeOff size={20} color="#94A3B8" />
                    : <Eye size={20} color="#94A3B8" />}
                </Pressable>
              </Animated.View>
            </View>

          </View>

          {/* Actions */}
          <View>

            {/* Primary CTA */}
            <Pressable
              className={`h-[50px] bg-blue-600 rounded-xl items-center justify-center mb-1${isDisabled ? ' opacity-40' : ''}`}
              style={({ pressed }) => (!isDisabled && pressed) ? styles.pressed : undefined}
              onPress={handleLogin}
              disabled={isDisabled}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white text-[17px] leading-[22px] font-semibold">Bejelentkezés</Text>}
            </Pressable>

            {/* Forgot password */}
            <Pressable
              className="h-11 items-center justify-center"
              style={({ pressed }) => pressed ? styles.pressed : undefined}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text className="text-[15px] leading-5 text-blue-600">Elfelejtettem a jelszavam</Text>
            </Pressable>

            {/* Divider */}
            <View className="h-8 flex-row items-center gap-3">
              <View className="flex-1 bg-slate-200 dark:bg-slate-700" style={styles.hairline} />
              <Text className="text-[13px] leading-[18px] text-slate-400">vagy</Text>
              <View className="flex-1 bg-slate-200 dark:bg-slate-700" style={styles.hairline} />
            </View>

            {/* Register */}
            <Pressable
              className="h-[50px] items-center justify-center"
              style={({ pressed }) => pressed ? styles.pressed : undefined}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text className="text-[17px] leading-[22px] font-semibold text-slate-950 dark:text-slate-50">
                Még nincs fiókom — Regisztrálok
              </Text>
            </Pressable>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 34,
  },
  inputContainer: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.75,
  },
})
