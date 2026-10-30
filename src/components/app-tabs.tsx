import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="lists">
        <NativeTabs.Trigger.Label>Listák</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Fedezd fel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/explore.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
