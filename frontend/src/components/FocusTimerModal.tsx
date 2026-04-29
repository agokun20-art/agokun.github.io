import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../theme';
import { haptic } from '../haptics';
import { api } from '../api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const PRESETS = [15, 25, 45];

export default function FocusTimerModal({ visible, onClose, onSaved }: Props) {
  const [goalMinutes, setGoalMinutes] = useState(25);
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const intervalRef = useRef<any>(null);

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (running) {
      pulse.value = withRepeat(
        withTiming(1.04, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [running, pulse]);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    if (!visible) {
      stop(false);
      setElapsedSec(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const start = () => {
    haptic.medium();
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
  };
  const pause = () => {
    haptic.light();
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const stop = async (save: boolean) => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const minutesDone = Math.floor(elapsedSec / 60);
    if (save && minutesDone > 0) {
      try {
        await api.addFocus(minutesDone);
        haptic.success();
        onSaved && onSaved();
      } catch {}
    }
  };

  const finishAndClose = async () => {
    await stop(true);
    onClose();
  };

  const targetSec = goalMinutes * 60;
  const progress = Math.min(1, elapsedSec / targetSec);
  const remaining = Math.max(0, targetSec - elapsedSec);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  // Completion triggers a soft haptic
  useEffect(() => {
    if (running && elapsedSec >= targetSec && targetSec > 0) {
      haptic.success();
      pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSec]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop} testID="focus-timer-modal">
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Focus</Text>
            <Pressable
              onPress={finishAndClose}
              style={styles.closeBtn}
              hitSlop={8}
              testID="focus-close-btn"
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.sub}>
            A quiet block of deep work. We&apos;ll log your minutes when you&apos;re done.
          </Text>

          <View style={styles.ringWrap}>
            <Animated.View style={[styles.ringOuter, ringStyle]}>
              <View style={styles.ringInner}>
                <Text style={styles.timeText}>
                  {mm}:{ss}
                </Text>
                <Text style={styles.timeLabel}>
                  {elapsedSec >= targetSec ? 'done' : 'remaining'}
                </Text>
              </View>
              <View
                style={[styles.progressArc, { height: 6 }]}
              />
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, height: 6 },
                ]}
              />
            </Animated.View>
          </View>

          <View style={styles.presetRow}>
            {PRESETS.map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  haptic.selection();
                  setGoalMinutes(m);
                  setElapsedSec(0);
                }}
                style={[styles.preset, goalMinutes === m && styles.presetActive]}
                testID={`focus-preset-${m}`}
                disabled={running}
              >
                <Text style={[styles.presetText, goalMinutes === m && styles.presetTextActive]}>
                  {m}m
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            {!running ? (
              <Pressable onPress={start} style={[styles.btn, styles.btnPrimary]} testID="focus-start-btn">
                <Ionicons name="play" size={16} color={COLORS.bg} />
                <Text style={styles.btnPrimaryText}>
                  {elapsedSec > 0 ? 'Resume' : 'Start'}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={pause} style={[styles.btn, styles.btnPrimary]} testID="focus-pause-btn">
                <Ionicons name="pause" size={16} color={COLORS.bg} />
                <Text style={styles.btnPrimaryText}>Pause</Text>
              </Pressable>
            )}
            <Pressable onPress={finishAndClose} style={[styles.btn, styles.btnGhost]} testID="focus-done-btn">
              <Text style={styles.btnGhostText}>Save & close</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 44 : SPACING.xxl,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '600', letterSpacing: -0.6 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { color: COLORS.textSecondary, fontSize: 13, marginTop: SPACING.sm, lineHeight: 18 },
  ringWrap: { alignItems: 'center', marginVertical: SPACING.xxl },
  ringOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringInner: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timeText: {
    color: COLORS.text,
    fontSize: 54,
    fontWeight: '300',
    letterSpacing: -2,
  },
  timeLabel: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  progressArc: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    backgroundColor: COLORS.text,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  preset: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  presetText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  presetTextActive: { color: COLORS.bg, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
  },
  btnPrimary: { backgroundColor: COLORS.text },
  btnPrimaryText: { color: COLORS.bg, fontSize: 14, fontWeight: '700' },
  btnGhost: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnGhostText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
});
