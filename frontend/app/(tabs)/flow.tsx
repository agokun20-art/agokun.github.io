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
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import { api } from '../../src/api';

type Card = {
  id: string;
  title: string;
  icon: string;
  value: string;
  label: string;
  delta: string;
  positive: boolean;
  accent: string;
};

const CARD_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  clock: 'time-outline',
  wallet: 'wallet-outline',
  'heart-pulse': 'pulse-outline',
  users: 'people-outline',
  battery: 'battery-half-outline',
};

export default function FlowScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.flowDashboard();
      setCards(data.cards);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // Bento layout: Time = wide, Money/Health = side-by-side, Connections = wide, Energy = wide
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
          <Text style={styles.title}>How's it going?</Text>
          <Text style={styles.subtitle}>
            A quick pulse on the five things that matter most.
          </Text>
        </Animated.View>

        {/* Time (wide) */}
        {cards[0] && (
          <Animated.View entering={FadeInDown.duration(500).delay(80)}>
            <FlowCardWide card={cards[0]} />
          </Animated.View>
        )}

        {/* Money + Health (side by side) */}
        <View style={styles.row}>
          {cards[1] && (
            <Animated.View
              entering={FadeInDown.duration(500).delay(160)}
              style={styles.half}
            >
              <FlowCardSquare card={cards[1]} />
            </Animated.View>
          )}
          {cards[2] && (
            <Animated.View
              entering={FadeInDown.duration(500).delay(220)}
              style={styles.half}
            >
              <FlowCardSquare card={cards[2]} />
            </Animated.View>
          )}
        </View>

        {/* Connections */}
        {cards[3] && (
          <Animated.View entering={FadeInDown.duration(500).delay(280)}>
            <FlowCardWide card={cards[3]} />
          </Animated.View>
        )}

        {/* Energy */}
        {cards[4] && (
          <Animated.View entering={FadeInDown.duration(500).delay(340)}>
            <FlowCardEnergy card={cards[4]} />
          </Animated.View>
        )}

        {/* Pro banner */}
        <Animated.View entering={FadeInDown.duration(500).delay(420)} style={styles.proBanner}>
          <View style={styles.proIcon}>
            <Ionicons name="diamond-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>Flow Pro</Text>
            <Text style={styles.proSub}>Unlock weekly patterns, habit AI and family insights.</Text>
          </View>
          <Pressable style={styles.proCta} testID="pro-upgrade-btn">
            <Text style={styles.proCtaText}>Try free</Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FlowCardWide({ card }: { card: Card }) {
  return (
    <Pressable style={[styles.card, styles.cardWide]} testID={`flow-card-${card.id}`}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: `${card.accent}22` }]}>
          <Ionicons
            name={CARD_ICON[card.icon] || 'ellipse-outline'}
            size={18}
            color={card.accent}
          />
        </View>
        <Text style={styles.cardTitle}>{card.title}</Text>
      </View>
      <Text style={styles.cardValue}>{card.value}</Text>
      <Text style={styles.cardLabel}>{card.label}</Text>
      <View style={styles.deltaRow}>
        <View style={[styles.deltaDot, { backgroundColor: card.accent }]} />
        <Text style={[styles.deltaText, { color: card.accent }]}>{card.delta}</Text>
      </View>
    </Pressable>
  );
}

function FlowCardSquare({ card }: { card: Card }) {
  return (
    <Pressable style={[styles.card, styles.cardSquare]} testID={`flow-card-${card.id}`}>
      <View style={[styles.iconBadge, { backgroundColor: `${card.accent}22`, alignSelf: 'flex-start' }]}>
        <Ionicons
          name={CARD_ICON[card.icon] || 'ellipse-outline'}
          size={18}
          color={card.accent}
        />
      </View>
      <Text style={styles.cardTitleSmall}>{card.title}</Text>
      <Text style={styles.cardValueSmall}>{card.value}</Text>
      <Text style={styles.cardLabelSmall} numberOfLines={1}>
        {card.label}
      </Text>
      <Text style={[styles.deltaTextSmall, { color: card.accent }]} numberOfLines={1}>
        {card.delta}
      </Text>
    </Pressable>
  );
}

function FlowCardEnergy({ card }: { card: Card }) {
  const pct = parseInt(card.value, 10);
  return (
    <Pressable style={[styles.card, styles.cardWide]} testID={`flow-card-${card.id}`}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: `${card.accent}22` }]}>
          <Ionicons name="battery-half-outline" size={18} color={card.accent} />
        </View>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={[styles.cardValueInline, { color: card.accent }]}>{card.value}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%`, backgroundColor: card.accent },
          ]}
        />
      </View>
      <Text style={styles.cardLabel}>{card.label}</Text>
      <Text style={[styles.deltaText, { color: card.accent, marginTop: SPACING.sm }]}>
        {card.delta}
      </Text>
    </Pressable>
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
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
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
  cardSquare: { minHeight: 168 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
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
  cardValueInline: {
    fontSize: 20,
    fontWeight: '600',
  },
  cardLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.md },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deltaDot: { width: 6, height: 6, borderRadius: 3 },
  deltaText: { fontSize: 12, fontWeight: '600' },
  cardTitleSmall: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
  },
  cardValueSmall: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -1,
    marginTop: 4,
  },
  cardLabelSmall: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  deltaTextSmall: { fontSize: 11, fontWeight: '600', marginTop: SPACING.sm },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: { height: 6, borderRadius: 3 },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,192,0.25)',
    marginTop: SPACING.md,
  },
  proIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,229,192,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  proSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  proCta: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  proCtaText: { color: COLORS.bg, fontSize: 12, fontWeight: '700' },
});
