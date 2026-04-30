import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import AddPriorityModal from '../../src/components/AddPriorityModal';
import AddExpenseModal from '../../src/components/AddExpenseModal';
import IntentionModal from '../../src/components/IntentionModal';
import NorthStarCard from '../../src/components/NorthStarCard';
import QuickAddInput from '../../src/components/QuickAddInput';
import { api } from '../../src/api';
import { getCurrentCoords } from '../../src/location';
import { haptic } from '../../src/haptics';

type Priority = {
  id: string;
  title: string;
  time?: string;
  category?: string;
  done: boolean;
};

const WEATHER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  sunny: 'sunny',
  moon: 'moon',
  'partly-sunny': 'partly-sunny',
  'cloudy-night': 'cloudy-night',
  cloudy: 'cloudy',
  rainy: 'rainy',
  snow: 'snow',
  thunderstorm: 'thunderstorm',
};

const CAT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Work: 'briefcase-outline',
  Personal: 'happy-outline',
  Health: 'pulse-outline',
  Connect: 'people-outline',
  Errand: 'bag-outline',
  Task: 'ellipse-outline',
};

export default function HomeScreen() {
  const router = useRouter();
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const [addingPriority, setAddingPriority] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [intentionOpen, setIntentionOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const load = useCallback(async () => {
    try {
      const coords = await getCurrentCoords();
      if (!coords) setLocDenied(true);
      else setLocDenied(false);
      const data = await api.morningBrief(coords ? { lat: coords.lat, lon: coords.lon } : undefined);
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

  useFocusEffect(
    useCallback(() => {
      if (!loading) load();
    }, [load, loading])
  );

  const togglePriority = async (p: Priority) => {
    const nextDone = !p.done;
    haptic.light();
    setBrief((b: any) => ({
      ...b,
      priorities: b.priorities.map((x: Priority) =>
        x.id === p.id ? { ...x, done: nextDone } : x
      ),
    }));
    try {
      await api.updatePriority(p.id, { done: nextDone });
      if (nextDone) {
        haptic.success();
        flashToast('Nice. One less thing.');
      }
    } catch {}
  };

  const confirmDeletePriority = (p: Priority) => {
    const doDelete = async () => {
      await api.deletePriority(p.id);
      setBrief((b: any) => ({
        ...b,
        priorities: b.priorities.filter((x: Priority) => x.id !== p.id),
      }));
      flashToast('Removed');
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`Delete "${p.title}"?`)) doDelete();
    } else {
      Alert.alert('Delete priority', `Delete "${p.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleQuickAction = async (action: string) => {
    haptic.light();
    try {
      if (action === 'water') {
        await api.addWater();
        flashToast('+1 glass of water');
      } else if (action === 'focus') {
        await api.addFocus(15);
        flashToast('+15 minutes of focus');
      } else if (action === 'expense') {
        setAddingExpense(true);
      } else if (action === 'chat') {
        router.push('/(tabs)/decide');
      }
    } catch {}
  };

  const saveNewPriority = async (body: any) => {
    const created = await api.createPriority(body);
    setBrief((b: any) => ({
      ...b,
      priorities: [...(b.priorities || []), created],
    }));
    flashToast('Priority added');
  };

  const saveEditPriority = async (body: any) => {
    if (!editingPriority) return;
    const updated = await api.updatePriority(editingPriority.id, body);
    setBrief((b: any) => ({
      ...b,
      priorities: b.priorities.map((x: Priority) => (x.id === updated.id ? updated : x)),
    }));
    setEditingPriority(null);
  };

  const saveExpense = async (body: any) => {
    await api.createExpense(body);
    flashToast(`Added $${body.amount.toFixed(2)}`);
  };

  if (loading || !brief) {
    return (
      <SafeAreaView style={styles.loading} testID="screen-home-loading">
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const weather = brief.weather;
  const totalPriorities = brief.priorities?.length || 0;
  const leftCount = totalPriorities - (brief.priorities?.filter((p: any) => p.done).length || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-morning-brief">
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
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.overline} testID="home-date">
            {brief.date.toUpperCase()}
            {brief.location_label ? ` · ${brief.location_label.toUpperCase()}` : ''}
          </Text>
          <Text style={styles.greeting} testID="home-greeting">
            {brief.greeting},{'\n'}
            {brief.name}.
          </Text>
          {/* Intention pill */}
          <Pressable
            onPress={() => {
              haptic.light();
              setIntentionOpen(true);
            }}
            style={styles.intentionPill}
            testID="intention-pill"
          >
            {brief.intention && brief.intention.word ? (
              <>
                <View style={styles.intentionDot} />
                <Text style={styles.intentionLabel}>TODAY</Text>
                <Text style={styles.intentionWord}>{brief.intention.word}</Text>
              </>
            ) : (
              <>
                <Ionicons name="compass-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.intentionPlaceholder}>
                  Set your intention for today
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* North Star */}
        <NorthStarCard
          priority={brief.north_star}
          onToggle={togglePriority}
          onAsk={() => router.push('/(tabs)/decide')}
        />

        {/* Weather + Outfit */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          {weather ? (
            <GlassCard glow testID="card-weather-summary">
              <View style={styles.weatherRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>
                    TODAY{weather.label ? ` · ${weather.label.toUpperCase()}` : ''}
                  </Text>
                  <View style={styles.tempRow}>
                    <Text style={styles.temp}>{weather.temp}°</Text>
                    <Text style={styles.tempUnit}>{weather.unit}</Text>
                  </View>
                  <Text style={styles.condition}>{weather.condition}</Text>
                  <Text style={styles.highLow}>
                    H {weather.high}° · L {weather.low}°
                    {weather.rain_probability > 20
                      ? ` · ${weather.rain_probability}% rain`
                      : ''}
                  </Text>
                </View>
                <View style={styles.weatherIconBox}>
                  <Ionicons
                    name={WEATHER_ICONS[weather.icon] || 'partly-sunny'}
                    size={72}
                    color={COLORS.text}
                  />
                </View>
              </View>
              {brief.outfit && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.cardLabel}>OUTFIT · AI SUGGESTED</Text>
                  <Text style={styles.outfitText}>{brief.outfit.suggestion}</Text>
                  <Text style={styles.outfitReason}>{brief.outfit.reason}</Text>
                </>
              )}
            </GlassCard>
          ) : (
            <Pressable
              onPress={load}
              style={styles.locCard}
              testID="enable-location-btn"
            >
              <Ionicons name="location-outline" size={20} color={COLORS.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locTitle}>
                  {locDenied ? 'Enable location' : 'Fetching your weather…'}
                </Text>
                <Text style={styles.locSub}>
                  {locDenied
                    ? 'Flow needs location to show real-time weather and outfit ideas.'
                    : 'One moment…'}
                </Text>
              </View>
              <Ionicons name="refresh" size={18} color={COLORS.textSecondary} />
            </Pressable>
          )}
        </Animated.View>

        {/* Priorities */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s focus</Text>
            <Pressable
              onPress={() => setAddingPriority(true)}
              style={styles.addBtn}
              testID="add-priority-btn"
              hitSlop={8}
            >
              <Ionicons name="add" size={18} color={COLORS.bg} />
            </Pressable>
          </View>
          {totalPriorities > 0 && (
            <Text style={styles.sectionSub} testID="priorities-counter">
              {leftCount === 0 ? 'All done. Breathe.' : `${leftCount} left`}
            </Text>
          )}

          {/* Quick-add NL input */}
          <View style={{ marginBottom: SPACING.md }}>
            <QuickAddInput
              onCreated={load}
              onManual={() => setAddingPriority(true)}
            />
          </View>

          {totalPriorities === 0 ? (
            <Pressable
              onPress={() => setAddingPriority(true)}
              style={styles.emptyCard}
              testID="priorities-empty"
            >
              <Ionicons name="leaf-outline" size={28} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>A quiet canvas.</Text>
              <Text style={styles.emptySub}>
                Tap &quot;+&quot; to add your first small intention for today.
              </Text>
            </Pressable>
          ) : (
            brief.priorities.map((p: Priority, i: number) => (
              <Animated.View
                key={p.id}
                entering={FadeInDown.duration(400).delay(80 + i * 60)}
                layout={Layout.springify()}
              >
                <Pressable
                  onPress={() => togglePriority(p)}
                  onLongPress={() => confirmDeletePriority(p)}
                  style={({ pressed }) => [
                    styles.priorityItem,
                    pressed && { opacity: 0.7 },
                  ]}
                  testID={`priority-${p.id}`}
                >
                  <View style={[styles.checkCircle, p.done && styles.checkCircleDone]}>
                    {p.done && <Ionicons name="checkmark" size={14} color={COLORS.bg} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.priorityTitle, p.done && styles.priorityDone]}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                    <View style={styles.priorityMeta}>
                      <Ionicons
                        name={CAT_ICON[p.category || 'Task'] || 'ellipse-outline'}
                        size={11}
                        color={COLORS.textTertiary}
                      />
                      <Text style={styles.priorityMetaText}>
                        {p.category || 'Task'}
                        {p.time ? ` · ${p.time}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setEditingPriority(p)}
                    hitSlop={8}
                    style={styles.editDot}
                    testID={`priority-edit-${p.id}`}
                  >
                    <Ionicons name="create-outline" size={16} color={COLORS.textTertiary} />
                  </Pressable>
                </Pressable>
              </Animated.View>
            ))
          )}
          {totalPriorities > 0 && (
            <Text style={styles.hint}>Long-press to delete · tap pencil to edit</Text>
          )}
        </Animated.View>

        {/* Quote */}
        {brief.quote && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <GlassCard testID="card-quote" style={{ marginTop: SPACING.lg }}>
              <Text style={styles.quoteMark}>&ldquo;</Text>
              <Text style={styles.quoteText}>{brief.quote.text}</Text>
              <Text style={styles.quoteAuthor}>— {brief.quote.author}</Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>One-tap</Text>
          <View style={styles.quickGrid}>
            {(brief.quick_actions || []).map((qa: any) => {
              const icon: keyof typeof Ionicons.glyphMap =
                qa.icon === 'droplet'
                  ? 'water-outline'
                  : qa.icon === 'focus'
                    ? 'timer-outline'
                    : qa.icon === 'expense'
                      ? 'receipt-outline'
                      : 'sparkles-outline';
              return (
                <Pressable
                  key={qa.id}
                  onPress={() => handleQuickAction(qa.action)}
                  style={styles.quickAction}
                  testID={`quick-action-${qa.action}`}
                >
                  <View style={styles.quickIcon}>
                    <Ionicons name={icon} size={18} color={COLORS.text} />
                  </View>
                  <Text style={styles.quickLabel}>{qa.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(500)}>
          <Pressable
            onPress={() => router.push('/(tabs)/decide')}
            style={styles.askCta}
            testID="home-ask-flow-cta"
          >
            <Ionicons name="sparkles" size={18} color={COLORS.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.askTitle}>Ask Flow</Text>
              <Text style={styles.askSub}>&ldquo;What should I eat for lunch?&rdquo;</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={COLORS.text} />
          </Pressable>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {toast && (
        <View style={styles.toast} pointerEvents="none" testID="toast">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <AddPriorityModal
        visible={addingPriority}
        onClose={() => setAddingPriority(false)}
        onSave={saveNewPriority}
      />
      <AddPriorityModal
        visible={!!editingPriority}
        onClose={() => setEditingPriority(null)}
        onSave={saveEditPriority}
        initial={editingPriority || undefined}
        editing
      />
      <AddExpenseModal
        visible={addingExpense}
        onClose={() => setAddingExpense(false)}
        onSave={saveExpense}
      />
      <IntentionModal
        visible={intentionOpen}
        onClose={() => setIntentionOpen(false)}
        initialWord={brief.intention?.word || ''}
        initialNote={brief.intention?.note || ''}
        onSave={async (word, note) => {
          await api.setIntention(word, note);
          setBrief((b: any) => ({ ...b, intention: { word, note } }));
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  scroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  header: { marginBottom: SPACING.xxl, marginTop: SPACING.md },
  overline: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2.2,
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
  intentionPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intentionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.text },
  intentionLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  intentionWord: { color: COLORS.text, fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  intentionPlaceholder: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },
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
  locCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  locSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  section: { marginTop: SPACING.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  sectionSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.md },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SPACING.sm,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptySub: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
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
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  priorityTitle: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  priorityDone: { color: COLORS.textTertiary, textDecorationLine: 'line-through' },
  priorityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  priorityMetaText: { color: COLORS.textTertiary, fontSize: 12 },
  editDot: { padding: 4 },
  hint: {
    color: COLORS.textTertiary,
    fontSize: 11,
    marginTop: SPACING.sm,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  quoteMark: {
    color: COLORS.text,
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
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { color: COLORS.text, fontSize: 13, fontWeight: '500', flex: 1 },
  askCta: {
    marginTop: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  askTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  askSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
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
