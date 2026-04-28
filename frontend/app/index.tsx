import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { api } from '../src/api';
import { COLORS } from '../src/theme';

export default function Index() {
  const [state, setState] = useState<'loading' | 'onboard' | 'home'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const p = await api.profile();
        setState(p.onboarded ? 'home' : 'onboard');
      } catch {
        setState('onboard');
      }
    })();
  }, []);

  if (state === 'loading') {
    return (
      <View
        style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  return state === 'onboard' ? <Redirect href="/onboarding" /> : <Redirect href="/(tabs)/home" />;
}
