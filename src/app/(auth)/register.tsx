import { router } from 'expo-router'
import { Eye, EyeOff } from 'lucide-react-native'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { supabase } from '@/lib/supabase'

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) return
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), display_name: name.trim() },
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    router.replace('/(tabs)/lists')
  }

  const isDisabled = !name.trim() || !email.trim() || !password || loading

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Header */}
          <Pressable style={styles.backRow} onPress={() => router.back()}>
            <Text style={styles.backText}>← Vissza</Text>
          </Pressable>

          <Text style={styles.heading}>Regisztráció</Text>
          <Text style={styles.subheading}>Hozz létre egy új fiókot</Text>

          {error && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Teljes név</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(t) => { setName(t); setError(null) }}
                placeholder="Kovács János"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>

            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null) }}
                placeholder="nev@pelda.hu"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Jelszó</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null) }}
                  placeholder="Min. 8 karakter"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}>
                  {showPassword
                    ? <EyeOff size={20} color="#94A3B8" />
                    : <Eye size={20} color="#94A3B8" />}
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                isDisabled && styles.primaryButtonDisabled,
                pressed && !isDisabled && styles.pressed,
              ]}
              onPress={handleRegister}
              disabled={isDisabled}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryButtonText}>Regisztráció</Text>}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}
              onPress={() => router.back()}>
              <Text style={styles.ghostButtonText}>Már van fiókom — Belépek</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  backRow: { marginBottom: 24 },
  backText: { fontSize: 15, color: '#2563EB' },
  heading: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: -0.68,
    color: '#0F172A',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    lineHeight: 20,
    color: '#94A3B8',
    marginBottom: 32,
  },
  toast: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  toastText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  form: { gap: 20, marginBottom: 32 },
  fieldWrapper: { gap: 6 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#0F172A' },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    lineHeight: 22,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  passwordWrapper: { position: 'relative' },
  eyeButton: { position: 'absolute', right: 14, top: 15 },
  buttons: { gap: 12 },
  primaryButton: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
  ghostButton: { alignItems: 'center', paddingVertical: 10 },
  ghostButtonText: { fontSize: 15, lineHeight: 20, color: '#2563EB' },
  pressed: { opacity: 0.75 },
})
