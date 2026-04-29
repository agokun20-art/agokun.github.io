import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, RADIUS } from '../theme';

type Props = { width?: number | string; height?: number; radius?: number; style?: any };

export default function Skeleton({ width = '100%', height = 14, radius = 6, style }: Props) {
  const shimmer = useSharedValue(0.4);
  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(0.9, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmer]);
  const animated = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return (
    <Animated.View
      style={[
        styles.box,
        { width, height, borderRadius: radius } as any,
        animated,
        style,
      ]}
    />
  );
}

export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.surfaceElevated,
  },
});
