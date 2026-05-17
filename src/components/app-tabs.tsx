import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="lists">
        <Label>Listák</Label>
        <Icon src={require('@/assets/images/tabIcons/home.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <Label>Fedezd fel</Label>
        <Icon src={require('@/assets/images/tabIcons/explore.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profil">
        <Label>Profil</Label>
        <Icon src={require('@/assets/images/tabIcons/home.png')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
