import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../../src/theme';

type Props = {
  children: React.ReactNode;
  style?: any;
  glow?: boolean;
  testID?: string;
};

export default function GlassCard({ children, style, glow, testID }: Props) {
  return (
    <View style={[styles.wrap, style]} testID={testID}>
      <LinearGradient
        colors={
          glow
            ? ['rgba(0,229,192,0.08)', 'rgba(18,24,43,0.85)']
            : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.surface,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  inner: {
    padding: 20,
  },
});
