import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import { api } from '../../src/api';

type QuickAction = { id: string; label: string; icon: string };
type Priority = { id: string; title: string; time: string; category: string; done: boolean };

const QA_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  coffee: 'cafe-outline',
  car: 'car-outline',
  droplet: 'water-outline',
  divide: 'receipt-outline',
};

const CAT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Work: 'briefcase-outline',
  Connect: 'people-outline',
  Health: 'pulse-outline',
};

export default function HomeScreen() {
  const router = useRouter();
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donePriorities, setDonePriorities] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await api.morningBrief();
      setBrief(data);
    } catch (e) {
      console.log('brief error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const togglePriority = (id: string) => {
    setDonePriorities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading || !brief) {
    return (
      <SafeAreaView style={styles.loading} testID="screen-home-loading">
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-morning-brief">
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(0,0,0,0)']}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.overline} testID="home-date">{brief.date.toUpperCase()}</Text>
          <Text style={styles.greeting} testID="home-greeting">
            {brief.greeting},{'\n'}
            <Text style={{ color: COLORS.primary }}>{brief.name}.</Text>
          </Text>
        </Animated.View>

        {/* Weather + Outfit card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <GlassCard glow testID="card-weather-summary">
            <View style={styles.weatherRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>TODAY</Text>
                <View style={styles.tempRow}>
                  <Text style={styles.temp}>{brief.weather.temp}°</Text>
                  <Text style={styles.tempUnit}>{brief.weather.unit}</Text>
                </View>
                <Text style={styles.condition}>{brief.weather.condition}</Text>
                <Text style={styles.highLow}>
                  H {brief.weather.high}° · L {brief.weather.low}°
                </Text>
              </View>
              <View style={styles.weatherIconBox}>
                <Ionicons name="partly-sunny" size={64} color={COLORS.primary} />
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardLabel}>OUTFIT · SUGGESTED</Text>
            <Text style={styles.outfitText}>{brief.outfit.suggestion}</Text>
            <Text style={styles.outfitReason}>{brief.outfit.reason}</Text>
          </GlassCard>
        </Animated.View>

        {/* Priorities */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's focus</Text>
            <Text style={styles.sectionCount}>
              {brief.priorities.length - donePriorities.size} left
            </Text>
          </View>
          {brief.priorities.map((p: Priority, i: number) => {
            const done = donePriorities.has(p.id);
            return (
              <Animated.View
                key={p.id}
                entering={FadeInDown.duration(400).delay(300 + i * 80)}
              >
                <Pressable
                  onPress={() => togglePriority(p.id)}
                  style={({ pressed }) => [
                    styles.priorityItem,
                    pressed && { opacity: 0.7 },
                  ]}
                  testID={`priority-${p.id}`}
                >
                  <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
                    {done && <Ionicons name="checkmark" size={16} color={COLORS.bg} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.priorityTitle, done && styles.priorityDone]}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                    <View style={styles.priorityMeta}>
                      <Ionicons
                        name={CAT_ICON[p.category] || 'ellipse-outline'}
                        size={12}
                        color={COLORS.textTertiary}
                      />
                      <Text style={styles.priorityMetaText}>
                        {p.category} · {p.time}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Quote */}
        <Animated.View entering={FadeInDown.duration(500).delay(450)}>
          <GlassCard testID="card-quote" style={{ marginTop: SPACING.lg }}>
            <Text style={styles.quoteMark}>&ldquo;</Text>
            <Text style={styles.quoteText}>{brief.quote.text}</Text>
            <Text style={styles.quoteAuthor}>— {brief.quote.author}</Text>
          </GlassCard>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(550)} style={styles.section}>
          <Text style={styles.sectionTitle}>One-tap</Text>
          <View style={styles.quickGrid}>
            {brief.quick_actions.map((qa: QuickAction) => (
              <Pressable
                key={qa.id}
                style={styles.quickAction}
                testID={`quick-action-${qa.id}`}
              >
                <View style={styles.quickIcon}>
                  <Ionicons
                    name={QA_ICON[qa.icon] || 'flash-outline'}
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.quickLabel}>{qa.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Ask Flow CTA */}
        <Animated.View entering={FadeInDown.duration(500).delay(650)}>
          <Pressable
            onPress={() => router.push('/(tabs)/decide')}
            style={styles.askCta}
            testID="home-ask-flow-cta"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="sparkles" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.askTitle}>Ask Flow</Text>
              <Text style={styles.askSub}>&ldquo;What should I eat for lunch?&rdquo;</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
          </Pressable>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  scroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  header: { marginBottom: SPACING.xxl, marginTop: SPACING.md },
  overline: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  greeting: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  cardLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  weatherRow: { flexDirection: 'row', alignItems: 'center' },
  tempRow: { flexDirection: 'row', alignItems: 'flex-start' },
  temp: {
    color: COLORS.text,
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: -2.5,
    lineHeight: 60,
  },
  tempUnit: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
    marginLeft: 2,
  },
  condition: { color: COLORS.text, fontSize: 16, fontWeight: '500', marginTop: 4 },
  highLow: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  weatherIconBox: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  outfitText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 4,
  },
  outfitReason: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  section: { marginTop: SPACING.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: SPACING.md,
  },
  sectionCount: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priorityTitle: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  priorityDone: {
    color: COLORS.textTertiary,
    textDecorationLine: 'line-through',
  },
  priorityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  priorityMetaText: { color: COLORS.textTertiary, fontSize: 12 },
  quoteMark: {
    color: COLORS.primary,
    fontSize: 42,
    lineHeight: 36,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  quoteText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
    letterSpacing: -0.2,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: SPACING.md,
    letterSpacing: 0.5,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  quickAction: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { color: COLORS.text, fontSize: 13, fontWeight: '500', flex: 1 },
  askCta: {
    marginTop: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    overflow: 'hidden',
  },
  askTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  askSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
});
