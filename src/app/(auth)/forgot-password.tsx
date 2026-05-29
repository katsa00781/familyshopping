import { router } from 'expo-router'
import { ArrowLeft, Mail } from 'lucide-react-native'
import { useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'

import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store/toastStore'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function ForgotPasswordScreen() {
  const dark = useColorScheme() === 'dark'
  const showToast = useToastStore((s) => s.showToast)

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    setEmailError(null)

    if (!email.trim()) {
      setEmailError('Add meg az email-címedet.')
      return
    }
    if (!isValidEmail(email.trim())) {
      setEmailError('Érvénytelen email-cím.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'bevasarlo://reset-password',
      })
      if (error) throw error
      setSent(true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Hiba a küldés során.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const bg = dark ? '#111827' : '#F9FAFB'
  const card = dark ? '#1F2937' : '#FFFFFF'
  const text = dark ? '#F9FAFB' : '#111827'
  const muted = dark ? '#9CA3AF' : '#6B7280'
  const border = dark ? '#374151' : '#E5E7EB'
  const inputBg = dark ? '#111827' : '#F3F4F6'

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Back */}
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Vissza"
          >
            <ArrowLeft size={22} color={muted} />
            <Text style={[styles.backText, { color: muted }]}>Vissza</Text>
          </Pressable>

          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            {sent ? (
              <View style={styles.sentContainer}>
                <View style={styles.mailIconWrapper}>
                  <Mail size={40} color="#2563EB" />
                </View>
                <Text style={[styles.title, { color: text }]}>Email elküldve</Text>
                <Text style={[styles.sentBody, { color: muted }]}>
                  A jelszó-visszaállítási linket elküldtük a{' '}
                  <Text style={{ color: text, fontWeight: '600' }}>{email}</Text> címre.
                  {'\n\n'}Ellenőrizd a beérkező levelek mappáját (és a spam mappát is).
                </Text>
                <Pressable
                  style={styles.loginBtn}
                  onPress={() => router.replace('/(auth)/login')}
                  accessibilityLabel="Vissza a bejelentkezéshez"
                >
                  <Text style={styles.loginBtnText}>Vissza a bejelentkezéshez</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={[styles.title, { color: text }]}>Elfelejtett jelszó</Text>
                <Text style={[styles.subtitle, { color: muted }]}>
                  Add meg az email-címedet, és küldünk egy visszaállítási linket.
                </Text>

                {/* Email */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: text }]}>Email-cím</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: inputBg, color: text, borderColor: emailError ? '#EF4444' : border },
                    ]}
                    placeholder="te@example.com"
                    placeholderTextColor={muted}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v)
                      if (emailError) setEmailError(null)
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    accessibilityLabel="Email-cím"
                  />
                  {emailError && <Text style={styles.errorText}>{emailError}</Text>}
                </View>

                <Pressable
                  style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={loading}
                  accessibilityLabel="Link küldése"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendBtnText}>Link küldése</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: '#2563EB',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sentContainer: {
    alignItems: 'center',
    gap: 16,
  },
  mailIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
