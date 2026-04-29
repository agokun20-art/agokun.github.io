import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import AddExpenseModal from '../../src/components/AddExpenseModal';
import FocusTimerModal from '../../src/components/FocusTimerModal';
import { api } from '../../src/api';
import { haptic } from '../../src/haptics';

type Card = {
  id: string;
  title: string;
  icon: string;
  value: string;
  label: string;
  delta: string;
  progress: number;
  accent: string;
  energy_rating?: number;
};

const CARD_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  clock: 'time-outline',
  wallet: 'wallet-outline',
  'heart-pulse': 'pulse-outline',
  users: 'people-outline',
  battery: 'battery-half-outline',
};

export default function FlowScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [streaks, setStreaks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  };

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([api.flowDashboard(), api.habitsStreaks()]);
      setCards(d.cards);
      setStreaks(s);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const incrementWater = async () => {
    haptic.light();
    await api.addWater();
    flashToast('+1 glass');
    load();
  };
  const decrementWater = async () => {
    haptic.selection();
    await api.removeWater();
    load();
  };
  const setEnergy = async (rating: number) => {
    haptic.medium();
    await api.setEnergy(rating);
    flashToast('Energy updated');
    load();
  };

  const saveExpense = async (body: any) => {
    await api.createExpense(body);
    haptic.success();
    flashToast(`Added $${body.amount.toFixed(2)}`);
    load();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const timeCard = cards.find((c) => c.id === 'time');
  const moneyCard = cards.find((c) => c.id === 'money');
  const healthCard = cards.find((c) => c.id === 'health');
  const connCard = cards.find((c) => c.id === 'connections');
  const energyCard = cards.find((c) => c.id === 'energy');

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-daily-flow">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.overline}>YOUR DAILY FLOW</Text>
          <Text style={styles.title}>How&apos;s it going?</Text>
          <Text style={styles.subtitle}>Tap any card to update a metric in real time.</Text>
        </Animated.View>

        {/* Streak pills */}
        {streaks && (streaks.water_streak > 0 || streaks.focus_streak > 0) && (
          <Animated.View entering={FadeInDown.duration(500).delay(40)} style={styles.streakRow}>
            {streaks.water_streak > 0 && (
              <Pressable
                onPress={() => router.push('/insights')}
                style={styles.streakPill}
                testID="streak-water"
              >
                <Ionicons name="flame" size={13} color={COLORS.text} />
                <Text style={styles.streakText}>
                  {streaks.water_streak}-day water streak
                </Text>
              </Pressable>
            )}
            {streaks.focus_streak > 0 && (
              <Pressable
                onPress={() => router.push('/insights')}
                style={styles.streakPill}
                testID="streak-focus"
              >
                <Ionicons name="flame" size={13} color={COLORS.text} />
                <Text style={styles.streakText}>
                  {streaks.focus_streak}-day focus streak
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Time — wide with focus timer */}
        {timeCard && (
          <Animated.View entering={FadeInDown.duration(500).delay(80)}>
            <View style={[styles.card, styles.cardWide]} testID="flow-card-time">
              <CardHeader title="Time" icon="time-outline" accent={timeCard.accent} />
              <Text style={styles.cardValue}>{timeCard.value}</Text>
              <Text style={styles.cardLabel}>{timeCard.label}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${timeCard.progress * 100}%` }]} />
              </View>
              <View style={styles.cardActions}>
                <Text style={styles.deltaText}>{timeCard.delta}</Text>
                <Pressable
                  style={styles.cardBtn}
                  onPress={() => {
                    haptic.medium();
                    setFocusOpen(true);
                  }}
                  testID="flow-focus-open"
                >
                  <Ionicons name="play" size={12} color={COLORS.bg} />
                  <Text style={styles.cardBtnText}>Start focus</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={styles.row}>
          {/* Money */}
          {moneyCard && (
            <Animated.View entering={FadeInDown.duration(500).delay(140)} style={styles.half}>
              <Pressable
                style={[styles.card, styles.cardSquare]}
                onPress={() => setAddingExpense(true)}
                testID="flow-card-money"
              >
                <CardHeader compact title="Money" icon="wallet-outline" accent={moneyCard.accent} />
                <Text style={styles.cardValueSmall}>{moneyCard.value}</Text>
                <Text style={styles.cardLabelSmall}>{moneyCard.label}</Text>
                <Text style={styles.deltaSmall}>+ Add expense</Text>
              </Pressable>
            </Animated.View>
          )}
          {/* Health (water) */}
          {healthCard && (
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.half}>
              <View style={[styles.card, styles.cardSquare]} testID="flow-card-health">
                <CardHeader compact title="Health" icon="water-outline" accent={healthCard.accent} />
                <Text style={styles.cardValueSmall}>{healthCard.value}</Text>
                <Text style={styles.cardLabelSmall}>{healthCard.label}</Text>
                <View style={styles.waterCtrlRow}>
                  <Pressable
                    onPress={decrementWater}
                    style={styles.smallBtn}
                    testID="flow-water-minus"
                  >
                    <Ionicons name="remove" size={14} color={COLORS.text} />
                  </Pressable>
                  <Pressable
                    onPress={incrementWater}
                    style={[styles.smallBtn, styles.smallBtnPrimary]}
                    testID="flow-water-plus"
                  >
                    <Ionicons name="add" size={14} color={COLORS.bg} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Connections */}
        {connCard && (
          <Animated.View entering={FadeInDown.duration(500).delay(260)}>
            <View style={[styles.card, styles.cardWide]} testID="flow-card-connections">
              <CardHeader title="Connections" icon="people-outline" accent={connCard.accent} />
              <View style={styles.rowSmall}>
                <Text style={styles.cardValueMid}>{connCard.value}</Text>
                <Text style={styles.cardLabel}>{connCard.label}</Text>
              </View>
              <Text style={styles.deltaText}>{connCard.delta}</Text>
            </View>
          </Animated.View>
        )}

        {/* Energy — with 5 dots */}
        {energyCard && (
          <Animated.View entering={FadeInDown.duration(500).delay(320)}>
            <View style={[styles.card, styles.cardWide]} testID="flow-card-energy">
              <CardHeader title="Energy" icon="battery-half-outline" accent={energyCard.accent} />
              <Text style={styles.cardValueMid}>{energyCard.value}</Text>
              <Text style={styles.cardLabel}>{energyCard.label}</Text>
              <View style={styles.dotsRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = (energyCard.energy_rating || 0) >= n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setEnergy(n)}
                      style={[styles.dot, active && styles.dotActive]}
                      testID={`flow-energy-${n}`}
                    />
                  );
                })}
              </View>
              <Text style={styles.deltaText}>{energyCard.delta}</Text>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(500).delay(420)} style={styles.proBanner}>
          <View style={styles.proIcon}>
            <Ionicons name="diamond-outline" size={18} color={COLORS.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>Flow Pro</Text>
            <Text style={styles.proSub}>Weekly patterns, habit AI and family insights.</Text>
          </View>
          <Pressable style={styles.proCta} testID="pro-upgrade-btn">
            <Text style={styles.proCtaText}>Try free</Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {toast && (
        <View style={styles.toast} pointerEvents="none" testID="toast">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <AddExpenseModal
        visible={addingExpense}
        onClose={() => setAddingExpense(false)}
        onSave={saveExpense}
      />
      <FocusTimerModal
        visible={focusOpen}
        onClose={() => setFocusOpen(false)}
        onSaved={() => {
          flashToast('Focus saved');
          load();
        }}
      />
    </SafeAreaView>
  );
}

function CardHeader({
  title,
  icon,
  accent,
  compact,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.cardHeader, compact && { marginBottom: SPACING.sm }]}>
      <View style={[styles.iconBadge, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.cardTitle, compact && { fontSize: 11 }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  header: { marginTop: SPACING.md, marginBottom: SPACING.xl },
  overline: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -1,
    marginBottom: SPACING.sm,
  },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  streakRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streakText: { color: COLORS.text, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  row: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  rowSmall: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  half: { flex: 1 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  cardWide: {},
  cardSquare: { minHeight: 180 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  cardValue: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  cardValueMid: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -1,
    marginBottom: 4,
  },
  cardValueSmall: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -1,
    marginTop: 4,
  },
  cardLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.md },
  cardLabelSmall: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.text },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  deltaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
  deltaSmall: { color: COLORS.textSecondary, fontSize: 11, marginTop: SPACING.sm },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
  },
  cardBtnText: { color: COLORS.bg, fontSize: 12, fontWeight: '700' },
  waterCtrlRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnPrimary: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  dotsRow: { flexDirection: 'row', gap: 10, marginVertical: SPACING.md },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  dotActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  proIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  proSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  proCta: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
  },
  proCtaText: { color: COLORS.bg, fontSize: 12, fontWeight: '700' },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: COLORS.text,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  toastText: { color: COLORS.bg, fontSize: 13, fontWeight: '600' },
});
