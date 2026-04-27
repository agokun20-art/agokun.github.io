import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import { api } from '../../src/api';

export default function WindDownScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.eveningBrief();
        setData(res);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const maxSpend = Math.max(
    ...data.spending.breakdown.map((b: any) => b.amount)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-wind-down">
      <LinearGradient
        colors={['#000000', '#050505', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(0,0,0,0)']}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <Text style={styles.overline}>TONIGHT · {data.date.toUpperCase()}</Text>
          <Text style={styles.title}>Let&apos;s wind down.</Text>
          <Text style={styles.subtitle}>{data.summary}</Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.statsGrid}>
          <StatTile
            icon="footsteps-outline"
            value={data.stats.steps.toLocaleString()}
            label="steps"
            color={COLORS.primary}
          />
          <StatTile
            icon="time-outline"
            value={`${data.stats.focused_minutes}m`}
            label="focus"
            color={COLORS.info}
          />
          <StatTile
            icon="phone-portrait-outline"
            value={`${data.stats.screen_time_hours}h`}
            label="screen"
            color={COLORS.warning}
          />
          <StatTile
            icon="bed-outline"
            value={`${data.stats.sleep_last_night_hours}h`}
            label="slept"
            color={COLORS.accentViolet}
          />
        </Animated.View>

        {/* Spending */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today&apos;s spend</Text>
            <Text style={styles.spendTotal} testID="spend-total">
              ${data.spending.total.toFixed(2)}
            </Text>
          </View>
          {data.spending.breakdown.map((b: any, i: number) => {
            const pct = (b.amount / maxSpend) * 100;
            const colors = [COLORS.primary, COLORS.info, COLORS.warning];
            return (
              <View key={b.category} style={styles.spendRow}>
                <View style={styles.spendLabelRow}>
                  <Text style={styles.spendCategory}>{b.category}</Text>
                  <Text style={styles.spendAmount}>${b.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.spendTrack}>
                  <View
                    style={[
                      styles.spendFill,
                      { width: `${pct}%`, backgroundColor: colors[i % colors.length] },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Insights */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.insightSection}>
          <Text style={styles.sectionTitle}>Gentle insights</Text>
          {data.insights.map((t: string, i: number) => (
            <Animated.View
              key={i}
              entering={FadeInDown.duration(400).delay(380 + i * 100)}
              style={styles.insight}
            >
              <View style={styles.insightDot} />
              <Text style={styles.insightText}>{t}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Tomorrow */}
        <Animated.View entering={FadeInDown.duration(500).delay(550)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sunny-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.cardTitle, { flex: 1 }]}>Tomorrow</Text>
          </View>
          <TomorrowRow
            icon="calendar-outline"
            label="First event"
            value={data.tomorrow.first_event}
          />
          <TomorrowRow
            icon="rainy-outline"
            label="Weather"
            value={data.tomorrow.weather_hint}
          />
          <TomorrowRow
            icon="alarm-outline"
            label="Suggested wake"
            value={data.tomorrow.suggested_wake}
            last
          />
        </Animated.View>

        {/* Reflection */}
        <Animated.View entering={FadeInDown.duration(500).delay(650)}>
          <Pressable style={styles.reflection} testID="reflection-btn">
            <Text style={styles.reflectionLabel}>REFLECT</Text>
            <Text style={styles.reflectionText}>{data.reflection_prompt}</Text>
            <View style={styles.reflectionCta}>
              <Text style={styles.reflectionCtaText}>Write a note</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
            </View>
          </Pressable>
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statTile}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TomorrowRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.tomRow, !last && styles.tomRowBorder]}>
      <View style={styles.tomIconBox}>
        <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tomLabel}>{label}</Text>
        <Text style={styles.tomValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  header: { marginTop: SPACING.md, marginBottom: SPACING.xl },
  overline: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: -1.2,
    marginBottom: SPACING.md,
  },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statTile: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'flex-start',
    gap: 6,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  statLabel: {
    color: COLORS.textTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  cardTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  spendTotal: { color: COLORS.primary, fontSize: 22, fontWeight: '600', letterSpacing: -0.6 },
  spendRow: { marginBottom: SPACING.md },
  spendLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  spendCategory: { color: COLORS.textSecondary, fontSize: 13 },
  spendAmount: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  spendTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  spendFill: { height: 6, borderRadius: 3 },
  insightSection: { marginBottom: SPACING.lg },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginBottom: SPACING.md,
  },
  insight: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: 'flex-start',
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 7,
  },
  insightText: { flex: 1, color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  tomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  tomRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tomIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tomLabel: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tomValue: { color: COLORS.text, fontSize: 14, fontWeight: '500', marginTop: 2 },
  reflection: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: SPACING.xl,
  },
  reflectionLabel: {
    color: COLORS.primary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  reflectionText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.4,
    lineHeight: 26,
    marginBottom: SPACING.md,
  },
  reflectionCta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reflectionCtaText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
});
