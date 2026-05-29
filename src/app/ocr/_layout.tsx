import { Stack } from 'expo-router'

export default function OCRLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="preview" />
      <Stack.Screen name="processing" options={{ gestureEnabled: false }} />
      <Stack.Screen name="review" />
      <Stack.Screen name="confirm" />
    </Stack>
  )
}
