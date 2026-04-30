import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../theme';

type Priority = {
  id: string;
  title: string;
  time?: string;
  category?: string;
  done: boolean;
};

type Props = {
  priority: Priority | null;
  onToggle: (p: Priority) => void;
  onAsk: () => void;
};

export default function NorthStarCard({ priority, onToggle, onAsk }: Props) {
  const pulse = useSharedValue(0.55);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.9, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);
  const starStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (!priority) {
    return (
      <Animated.View entering={FadeInDown.duration(500).delay(80)} testID="north-star-empty">
        <View style={styles.emptyWrap}>
          <View style={styles.emptyRow}>
            <Ionicons name="star-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.overline}>NORTH STAR</Text>
          </View>
          <Text style={styles.emptyTitle}>One thing that would make today count.</Text>
          <Text style={styles.emptySub}>Add a priority to set your north star.</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(80)}
      style={styles.outer}
      testID="north-star"
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <Animated.View style={starStyle}>
          <Ionicons name="star" size={14} color={COLORS.text} />
        </Animated.View>
        <Text style={styles.overline}>NORTH STAR</Text>
      </View>
      <Text style={styles.title} numberOfLines={3}>
        {priority.title}
      </Text>
      {(priority.time || priority.category) && (
        <Text style={styles.meta}>
          {[priority.category, priority.time].filter(Boolean).join(' · ')}
        </Text>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={() => onToggle(priority)}
          style={[
            styles.btn,
            priority.done ? styles.btnGhost : styles.btnPrimary,
          ]}
          testID="north-star-done"
        >
          <Ionicons
            name={priority.done ? 'checkmark-circle' : 'checkmark-outline'}
            size={14}
            color={priority.done ? COLORS.text : COLORS.bg}
          />
          <Text
            style={[
              styles.btnText,
              priority.done ? styles.btnGhostText : styles.btnPrimaryText,
            ]}
          >
            {priority.done ? 'Completed' : 'Mark done'}
          </Text>
        </Pressable>
        <Pressable onPress={onAsk} style={[styles.btn, styles.btnGhost]} testID="north-star-ask">
          <Ionicons name="sparkles" size={14} color={COLORS.text} />
          <Text style={[styles.btnText, styles.btnGhostText]}>Ask Flow</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: COLORS.surface,
    padding: SPACING.xxl,
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  overline: {
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '700',
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 8,
  },
  meta: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.lg },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  btnText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  btnPrimary: { backgroundColor: COLORS.text },
  btnPrimaryText: { color: COLORS.bg },
  btnGhost: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnGhostText: { color: COLORS.text },
  emptyWrap: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 24,
    marginBottom: 4,
  },
  emptySub: { color: COLORS.textSecondary, fontSize: 13 },
});
