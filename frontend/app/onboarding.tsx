import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../src/theme';
import { api } from '../src/api';

function Orb() {
  const s = useSharedValue(1);
  React.useEffect(() => {
    s.value = withRepeat(
      withTiming(1.12, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 0.75 }));
  return (
    <View style={styles.orbWrap}>
      <Animated.View style={[styles.orbGlow, style]} />
      <View style={styles.orbCore} />
    </View>
  );
}

export default function Onboarding() {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const finish = async () => {
    const trimmed = name.trim() || 'Friend';
    setSaving(true);
    try {
      const current = await api.profile();
      await api.updateProfile({
        ...current,
        name: trimmed,
        greeting_name: trimmed,
        onboarded: true,
      });
      router.replace('/(tabs)/home');
    } catch {
      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="screen-onboarding">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.orbRow}>
            <Orb />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(150)}>
            <Text style={styles.overline}>WELCOME</Text>
            <Text style={styles.title}>I&apos;m Flow.</Text>
            <Text style={styles.subtitle}>
              Your calmer daily co-pilot. Weather, decisions, tiny wins — all in one place.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(280)} style={styles.field}>
            <Text style={styles.label}>WHAT SHOULD I CALL YOU?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your first name"
              placeholderTextColor={COLORS.textTertiary}
              style={styles.input}
              autoFocus
              onSubmitEditing={finish}
              returnKeyType="done"
              testID="onboarding-name-input"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.bullets}>
            <Bullet text="Real weather from your location" />
            <Bullet text="AI decisions whenever you're stuck" />
            <Bullet text="Your data, your device, your pace" />
          </Animated.View>

          <View style={{ flex: 1 }} />

          <Animated.View entering={FadeInDown.duration(600).delay(600)}>
            <Pressable
              onPress={finish}
              disabled={saving}
              style={[styles.cta, saving && { opacity: 0.6 }]}
              testID="onboarding-continue-btn"
            >
              {saving ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <>
                  <Text style={styles.ctaText}>Let&apos;s flow</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.bg} />
                </>
              )}
            </Pressable>
            <Text style={styles.footnote}>We never share your data. Ever.</Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxl },
  orbRow: { alignItems: 'center', marginBottom: SPACING.xxl, marginTop: SPACING.xl },
  orbWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryGlow,
  },
  orbCore: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
  },
  overline: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1.4,
    marginBottom: SPACING.md,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: SPACING.xxxl,
  },
  field: { marginBottom: SPACING.xl },
  label: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 18,
  },
  bullets: { gap: SPACING.sm, marginTop: SPACING.md },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 6 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textSecondary },
  bulletText: { color: COLORS.textSecondary, fontSize: 14 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
    marginBottom: SPACING.md,
  },
  ctaText: { color: COLORS.bg, fontSize: 16, fontWeight: '700' },
  footnote: {
    color: COLORS.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
});
