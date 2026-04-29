import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, SPACING } from '../src/theme';

const SECTIONS: { h: string; b: string }[] = [
  { h: '1. Accepting these terms', b: 'By using Flow, you agree to these terms. If you do not agree, please do not use the app.' },
  {
    h: '2. Your account & data',
    b: 'You are responsible for the content you create in Flow (priorities, expenses, chats). Flow is a personal tool — use it for yourself, not to impersonate others.',
  },
  {
    h: '3. AI assistant',
    b: 'Flow AI provides suggestions for decisions, outfits, and planning. It is not medical, legal, or financial advice. Always use your own judgment.',
  },
  {
    h: '4. Acceptable use',
    b: 'Do not attempt to reverse-engineer, resell, or use Flow to harass, defraud, or harm others. We may suspend accounts that break these rules.',
  },
  {
    h: '5. Service availability',
    b: 'Flow is provided "as is". We work hard to keep it running, but we do not guarantee uninterrupted service. Weather and AI features depend on third-party services.',
  },
  {
    h: '6. Subscriptions (future)',
    b: 'Some features (Flow Pro) may require a paid subscription. You will always be able to cancel; unused time is not refundable unless required by law.',
  },
  {
    h: '7. Changes',
    b: 'We may update these terms. Material changes will be posted in-app with a 7-day notice before taking effect.',
  },
  {
    h: '8. Liability',
    b: 'To the fullest extent permitted by law, Flow and its team are not liable for indirect or incidental damages arising from the use of the app.',
  },
  { h: '9. Governing law', b: 'These terms are governed by the laws of the jurisdiction of Flow\'s primary operating entity.' },
  { h: '10. Contact', b: 'Questions? Email hello@flowapp.daily.' },
];

export default function Terms() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-terms">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="terms-back-btn" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.overline}>EFFECTIVE APRIL 2026</Text>
          <Text style={styles.title}>Simple terms.</Text>
          <Text style={styles.intro}>
            Ten short sections. No legal maze.
          </Text>
        </Animated.View>
        {SECTIONS.map((s, i) => (
          <Animated.View key={s.h} entering={FadeIn.duration(400).delay(80 + i * 40)} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.b}>{s.b}</Text>
          </Animated.View>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  overline: { color: COLORS.textTertiary, fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: SPACING.md },
  title: { color: COLORS.text, fontSize: 32, fontWeight: '600', letterSpacing: -1, marginBottom: SPACING.md },
  intro: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: SPACING.xl },
  section: { paddingVertical: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  h: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: SPACING.sm, letterSpacing: -0.3 },
  b: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
});
