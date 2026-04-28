import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import AddExpenseModal from '../../src/components/AddExpenseModal';
import { api } from '../../src/api';

export default function WindDownScreen() {
  const [data, setData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  };

  const load = useCallback(async () => {
    try {
      const [res, ex] = await Promise.all([
        api.eveningBrief(),
        api.listExpenses(new Date().toISOString().split('T')[0]),
      ]);
      setData(res);
      setExpenses(ex.expenses || []);
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

  const saveExpense = async (body: any) => {
    await api.createExpense(body);
    flashToast(`+ $${body.amount.toFixed(2)}`);
    load();
  };

  const deleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    setExpenses((x) => x.filter((e) => e.id !== id));
    load();
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const maxSpend = Math.max(
    1,
    ...data.spending.breakdown.map((b: any) => b.amount)
  );
  const hasAnySpend = data.spending.total > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-wind-down">
      <LinearGradient
        colors={['#000000', '#050505', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(0,0,0,0)']}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
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
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <Text style={styles.overline}>TONIGHT · {data.date.toUpperCase()}</Text>
          <Text style={styles.title}>Let&apos;s wind down.</Text>
          <Text style={styles.subtitle}>{data.summary}</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.statsGrid}>
          <StatTile
            icon="water-outline"
            value={`${data.stats.water_glasses}/${data.stats.water_goal}`}
            label="water"
          />
          <StatTile
            icon="timer-outline"
            value={`${data.stats.focused_minutes}m`}
            label="focus"
          />
          <StatTile
            icon="checkmark-done-outline"
            value={`${data.stats.priorities_done}/${data.stats.priorities_total}`}
            label="done"
          />
          <StatTile
            icon="flash-outline"
            value={data.stats.energy_rating ? `${data.stats.energy_rating * 20}%` : '—'}
            label="energy"
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

          {!hasAnySpend ? (
            <Text style={styles.spendEmpty}>Nothing logged today.</Text>
          ) : (
            data.spending.breakdown.map((b: any) => {
              const pct = (b.amount / maxSpend) * 100;
              return (
                <View key={b.category} style={styles.spendRow}>
                  <View style={styles.spendLabelRow}>
                    <Text style={styles.spendCategory}>{b.category}</Text>
                    <Text style={styles.spendAmount}>${b.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.spendTrack}>
                    <View style={[styles.spendFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })
          )}

          <Pressable
            onPress={() => setAddingExpense(true)}
            style={styles.addExpenseBtn}
            testID="add-expense-btn"
          >
            <Ionicons name="add" size={16} color={COLORS.bg} />
            <Text style={styles.addExpenseText}>Add expense</Text>
          </Pressable>

          {expenses.length > 0 && (
            <View style={styles.expenseList}>
              {expenses.map((e) => (
                <View key={e.id} style={styles.expenseItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expName} numberOfLines={1}>
                      {e.category}
                      {e.note ? ` · ${e.note}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.expAmt}>${e.amount.toFixed(2)}</Text>
                  <Pressable
                    onPress={() => deleteExpense(e.id)}
                    hitSlop={8}
                    testID={`expense-delete-${e.id}`}
                  >
                    <Ionicons name="close" size={14} color={COLORS.textTertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Insights */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.insightSection}>
          <Text style={styles.sectionTitle}>Gentle insights</Text>
          {(data.insights || []).map((t: string, i: number) => (
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
            <Ionicons name="sunny-outline" size={18} color={COLORS.text} />
            <Text style={[styles.cardTitle, { flex: 1 }]}>Tomorrow</Text>
          </View>
          <Text style={styles.tomEventTitle} numberOfLines={2}>
            {data.tomorrow.first_event}
          </Text>
          {!!data.tomorrow.first_event_time && (
            <Text style={styles.tomEventTime}>{data.tomorrow.first_event_time}</Text>
          )}
        </Animated.View>

        {/* Reflection */}
        <Animated.View entering={FadeInDown.duration(500).delay(650)}>
          <Pressable style={styles.reflection} testID="reflection-btn">
            <Text style={styles.reflectionLabel}>REFLECT</Text>
            <Text style={styles.reflectionText}>{data.reflection_prompt}</Text>
            <View style={styles.reflectionCta}>
              <Text style={styles.reflectionCtaText}>Coming soon</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.text} />
            </View>
          </Pressable>
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <AddExpenseModal
        visible={addingExpense}
        onClose={() => setAddingExpense(false)}
        onSave={saveExpense}
      />
    </SafeAreaView>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statTile}>
      <Ionicons name={icon} size={18} color={COLORS.text} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    fontSize: 16,
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
  spendTotal: { color: COLORS.text, fontSize: 22, fontWeight: '600', letterSpacing: -0.6 },
  spendEmpty: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'left' },
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
  spendFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.text },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
    marginTop: SPACING.md,
  },
  addExpenseText: { color: COLORS.bg, fontSize: 13, fontWeight: '700' },
  expenseList: { marginTop: SPACING.md, gap: SPACING.sm },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  expName: { color: COLORS.textSecondary, fontSize: 13 },
  expAmt: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
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
    backgroundColor: COLORS.text,
    marginTop: 7,
  },
  insightText: { flex: 1, color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  tomEventTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  tomEventTime: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  reflection: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.xl,
  },
  reflectionLabel: {
    color: COLORS.text,
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
  reflectionCtaText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
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
