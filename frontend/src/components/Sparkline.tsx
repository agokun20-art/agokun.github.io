import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme';

type Day = { date: string; value: number; goal?: number; label?: string };

type Props = {
  days: Day[];
  maxHint?: number;
  height?: number;
  testID?: string;
};

export default function Sparkline({ days, maxHint, height = 48, testID }: Props) {
  const max = Math.max(1, maxHint || Math.max(...days.map((d) => d.value)));
  return (
    <View style={[styles.wrap, { height: height + 22 }]} testID={testID}>
      <View style={[styles.bars, { height }]}>
        {days.map((d, i) => {
          const h = Math.max(2, (d.value / max) * height);
          const met = d.goal && d.value >= (d.goal || 0);
          const isToday = i === days.length - 1;
          return (
            <View key={d.date} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: h },
                  met && styles.barMet,
                  isToday && styles.barToday,
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {days.map((d, i) => (
          <Text key={d.date} style={styles.label}>
            {d.label ?? shortDay(d.date, i === days.length - 1)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function shortDay(iso: string, isToday: boolean): string {
  if (isToday) return 'Now';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'narrow' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: {
    width: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  barMet: { backgroundColor: COLORS.textSecondary },
  barToday: { backgroundColor: COLORS.text },
  labels: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
