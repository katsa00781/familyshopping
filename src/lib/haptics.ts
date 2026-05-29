import * as Haptics from 'expo-haptics'

export const haptics = {
  light: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  },
  medium: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  },
  heavy: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  },
  success: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  },
  warning: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  },
  error: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  },
  selection: (): void => {
    void Haptics.selectionAsync()
  },
}
