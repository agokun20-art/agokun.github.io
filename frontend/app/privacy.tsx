import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../src/theme';

const SECTIONS: { h: string; b: string }[] = [
  {
    h: 'The short version',
    b: 'Flow stores only the data you create — your priorities, expenses, habits, and chats — on our secure servers. We do not sell it, we do not show ads, and we never share your personal information with third parties for marketing.',
  },
  {
    h: 'What we collect',
    b: '• Profile info you provide (your first name).\n• Priorities, expenses, and habit counts you log.\n• Your approximate location (only if you grant permission) to fetch live weather. Coordinates are stored at up to 2-decimal precision and never shared.\n• Chat messages you send to Flow AI, temporarily forwarded to the AI provider for a response.',
  },
  {
    h: 'What we do not collect',
    b: '• Your contacts, photos, or device identifiers.\n• Background location.\n• Advertising IDs.\n• Biometric data.',
  },
  {
    h: 'AI processing',
    b: 'When you chat with Flow, your message is sent to Anthropic\'s Claude for a single-turn response and returned to you. Messages are stored in your account so your conversation persists. You can clear them anytime.',
  },
  {
    h: 'Your controls',
    b: '• Export all your data from Settings → Export data.\n• Delete all your data from Settings → Reset all data. Deletion is immediate and irreversible.\n• Revoke location access anytime via your device settings.',
  },
  {
    h: 'Retention',
    b: 'Your data is kept until you delete it. If you stop using the app, your data may be deleted after 12 months of inactivity.',
  },
  {
    h: 'Children',
    b: 'Flow is not intended for users under 13. We do not knowingly collect data from children.',
  },
  {
    h: 'Changes',
    b: 'We will post updates to this policy in-app. Material changes will be highlighted.',
  },
  {
    h: 'Contact',
    b: 'Questions? Email hello@flowapp.daily — we read every message.',
  },
];

export default function Privacy() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-privacy">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="privacy-back-btn" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.overline}>EFFECTIVE APRIL 2026</Text>
          <Text style={styles.title}>Your data is yours.</Text>
          <Text style={styles.intro}>
            A plain-language summary of what we do and don&apos;t do with your information. No dark patterns.
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  overline: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  title: { color: COLORS.text, fontSize: 32, fontWeight: '600', letterSpacing: -1, marginBottom: SPACING.md },
  intro: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: SPACING.xl },
  section: {
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  h: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: SPACING.sm, letterSpacing: -0.3 },
  b: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
});
