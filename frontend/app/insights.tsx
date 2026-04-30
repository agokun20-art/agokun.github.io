import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../src/theme';
import Sparkline from '../src/components/Sparkline';
import { api } from '../src/api';
import { haptic } from '../src/haptics';

export default function Insights() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [streaks, setStreaks] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingWeekly, setGeneratingWeekly] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [h, s, p] = await Promise.all([
          api.habitsHistory(7),
          api.habitsStreaks(),
          api.profile(),
        ]);
        setHistory(h.history || []);
        setStreaks(s);
        setProfile(p);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchWeekly = async () => {
    setGeneratingWeekly(true);
    haptic.medium();
    try {
      const w = await api.weeklyBrief();
      setWeekly(w);
      haptic.success();
    } catch {
      haptic.warning();
    } finally {
      setGeneratingWeekly(false);
    }
  };

  const doExport = async () => {
    haptic.light();
    try {
      const data = await api.exportData();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flow-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('Export ready', `${Object.keys(data).length} sections exported.`);
      }
      haptic.success();
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const focusGoal = profile?.focus_goal || 180;
  const waterGoal = profile?.water_goal || 8;
  const focusDays = history.map((d) => ({
    date: d.date,
    value: d.focused_minutes,
    goal: focusGoal,
  }));
  const waterDays = history.map((d) => ({
    date: d.date,
    value: d.water_glasses,
    goal: waterGoal,
  }));
  const totalFocus = history.reduce((s, d) => s + (d.focused_minutes || 0), 0);
  const totalWater = history.reduce((s, d) => s + (d.water_glasses || 0), 0);
  const avgEnergy =
    history.length > 0
      ? Math.round(
          (history.reduce((s, d) => s + (d.energy_rating || 0), 0) / history.length) * 20
        )
      : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-insights">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="insights-back-btn" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Your 7 days</Text>
        <Pressable onPress={doExport} style={styles.exportBtn} testID="insights-export-btn" hitSlop={8}>
          <Ionicons name="download-outline" size={18} color={COLORS.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(500)}>
          <Text style={styles.overline}>AT A GLANCE</Text>
          <Text style={styles.title}>Patterns, quietly tracked.</Text>
        </Animated.View>

        {/* Streaks */}
        <Animated.View entering={FadeInDown.duration(500).delay(80)} style={styles.streakRow}>
          <StreakTile
            label="Water streak"
            value={streaks?.water_streak || 0}
            met={streaks?.water_today_met}
          />
          <StreakTile
            label="Focus streak"
            value={streaks?.focus_streak || 0}
            met={streaks?.focus_today_met}
          />
        </Animated.View>

        {/* Weekly AI narrative */}
        <Animated.View entering={FadeInDown.duration(500).delay(130)} style={styles.narrativeCard}>
          <View style={styles.narrativeHead}>
            <Ionicons name="sparkles" size={14} color={COLORS.text} />
            <Text style={styles.cardOver}>THIS WEEK · WRITTEN BY FLOW</Text>
          </View>
          {weekly ? (
            <>
              <Text style={styles.narrativeText}>{weekly.narrative}</Text>
              <View style={styles.narrativeStats}>
                <Text style={styles.statChip}>
                  {Math.floor((weekly.totals.focus_minutes || 0) / 60)}h focus
                </Text>
                <Text style={styles.statChip}>{weekly.totals.water_glasses} glasses</Text>
                <Text style={styles.statChip}>
                  {weekly.totals.priorities_done} priorities
                </Text>
                <Text style={styles.statChip}>${weekly.totals.spent.toFixed(0)}</Text>
              </View>
              <Pressable onPress={fetchWeekly} style={styles.refreshBtn} testID="weekly-refresh">
                <Ionicons name="refresh" size={12} color={COLORS.textSecondary} />
                <Text style={styles.refreshText}>Regenerate</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.narrativeIntro}>
                A warm, specific 3-sentence story of your last 7 days — written from your real data.
              </Text>
              <Pressable
                onPress={fetchWeekly}
                style={styles.narrativeCta}
                disabled={generatingWeekly}
                testID="weekly-generate"
              >
                {generatingWeekly ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={14} color={COLORS.bg} />
                    <Text style={styles.narrativeCtaText}>Tell my week</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </Animated.View>

        {/* Focus */}
        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardOver}>FOCUS</Text>
              <Text style={styles.cardTitle}>
                {Math.floor(totalFocus / 60)}h {totalFocus % 60}m
              </Text>
              <Text style={styles.cardSub}>last 7 days · goal {focusGoal}m/day</Text>
            </View>
          </View>
          <Sparkline days={focusDays} testID="sparkline-focus" />
        </Animated.View>

        {/* Water */}
        <Animated.View entering={FadeInDown.duration(500).delay(240)} style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardOver}>HYDRATION</Text>
              <Text style={styles.cardTitle}>{totalWater} glasses</Text>
              <Text style={styles.cardSub}>last 7 days · goal {waterGoal}/day</Text>
            </View>
          </View>
          <Sparkline days={waterDays} testID="sparkline-water" />
        </Animated.View>

        {/* Energy */}
        <Animated.View entering={FadeInDown.duration(500).delay(320)} style={styles.card}>
          <Text style={styles.cardOver}>AVERAGE ENERGY</Text>
          <Text style={styles.cardTitle}>{avgEnergy > 0 ? `${avgEnergy}%` : '—'}</Text>
          <Text style={styles.cardSub}>self-reported average</Text>
        </Animated.View>

        <Pressable onPress={doExport} style={styles.exportCta} testID="insights-export-cta">
          <Ionicons name="download-outline" size={16} color={COLORS.text} />
          <Text style={styles.exportText}>Export your data (JSON)</Text>
        </Pressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StreakTile({ label, value, met }: { label: string; value: number; met?: boolean }) {
  return (
    <View style={[streakStyles.tile, met && streakStyles.tileMet]}>
      <Ionicons name="flame-outline" size={18} color={met ? COLORS.bg : COLORS.text} />
      <Text style={[streakStyles.val, met && { color: COLORS.bg }]}>{value}</Text>
      <Text style={[streakStyles.lbl, met && { color: COLORS.bg }]}>{label}</Text>
    </View>
  );
}

const streakStyles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  tileMet: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  val: { color: COLORS.text, fontSize: 26, fontWeight: '600', letterSpacing: -1 },
  lbl: { color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
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
  exportBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.xl },
  overline: { color: COLORS.textTertiary, fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '600', letterSpacing: -0.8, marginBottom: SPACING.xl },
  streakRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: { marginBottom: SPACING.md },
  cardOver: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  cardSub: { color: COLORS.textSecondary, fontSize: 12, marginBottom: SPACING.md },
  exportCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginTop: SPACING.md,
  },
  exportText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  narrativeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  narrativeHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  narrativeText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: -0.1,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  narrativeIntro: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  narrativeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
  },
  narrativeCtaText: { color: COLORS.bg, fontSize: 13, fontWeight: '700' },
  narrativeStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md },
  statChip: {
    color: COLORS.textSecondary,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 6,
  },
  refreshText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },
});
