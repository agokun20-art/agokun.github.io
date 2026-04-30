import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../src/theme';
import { api } from '../src/api';
import { haptic } from '../src/haptics';

type Ritual = {
  id: string;
  name: string;
  emoji?: string;
  steps: string[];
  completed_today: boolean;
};

const EMOJI_OPTIONS = ['☀️', '🌙', '🌿', '🔥', '💧', '✨', '🎯', '📓'];

export default function Rituals() {
  const router = useRouter();
  const [items, setItems] = useState<Ritual[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.listRituals();
      setItems(r.rituals || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleComplete = async (r: Ritual) => {
    haptic.medium();
    const next = !r.completed_today;
    setItems((is) => is.map((x) => (x.id === r.id ? { ...x, completed_today: next } : x)));
    try {
      if (next) await api.completeRitual(r.id);
      else await api.undoRitual(r.id);
    } catch {}
  };

  const doDelete = async (r: Ritual) => {
    const go =
      typeof window !== 'undefined' && window.confirm
        ? window.confirm(`Delete "${r.name}"?`)
        : true;
    if (!go) return;
    setItems((is) => is.filter((x) => x.id !== r.id));
    try {
      await api.deleteRitual(r.id);
    } catch {}
  };

  const onCreated = (r: Ritual) => {
    setItems((is) => [...is, r]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-rituals">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="rituals-back" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Rituals</Text>
        <Pressable
          onPress={() => {
            haptic.light();
            setAdding(true);
          }}
          style={styles.iconBtn}
          testID="rituals-add"
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={COLORS.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.overline}>YOUR RITUALS</Text>
          <Text style={styles.title}>Small ceremonies, big compound.</Text>
          <Text style={styles.sub}>
            Bundle habits you want to do together. One tap marks them all for today.
          </Text>
        </Animated.View>

        {items.length === 0 ? (
          <Pressable
            onPress={() => setAdding(true)}
            style={styles.empty}
            testID="rituals-empty"
          >
            <Ionicons name="leaf-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No rituals yet.</Text>
            <Text style={styles.emptySub}>
              Try: Morning ritual · drink water · stretch · write one sentence.
            </Text>
            <View style={styles.emptyCta}>
              <Ionicons name="add" size={14} color={COLORS.bg} />
              <Text style={styles.emptyCtaText}>Create your first</Text>
            </View>
          </Pressable>
        ) : (
          items.map((r, i) => (
            <Animated.View
              key={r.id}
              entering={FadeInDown.duration(400).delay(i * 60)}
              layout={Layout.springify()}
            >
              <View style={[styles.card, r.completed_today && styles.cardDone]} testID={`ritual-${r.id}`}>
                <View style={styles.cardHead}>
                  <Text style={styles.emoji}>{r.emoji || '✨'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, r.completed_today && styles.cardTitleDone]}>
                      {r.name}
                    </Text>
                    <Text style={styles.stepCount}>
                      {r.steps.length} {r.steps.length === 1 ? 'step' : 'steps'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => doDelete(r)}
                    hitSlop={8}
                    testID={`ritual-delete-${r.id}`}
                  >
                    <Ionicons name="close" size={16} color={COLORS.textTertiary} />
                  </Pressable>
                </View>
                <View style={styles.stepsWrap}>
                  {r.steps.map((s, j) => (
                    <View key={j} style={styles.stepRow}>
                      <View style={[styles.stepDot, r.completed_today && styles.stepDotDone]} />
                      <Text
                        style={[styles.stepText, r.completed_today && styles.stepTextDone]}
                        numberOfLines={1}
                      >
                        {s}
                      </Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={() => toggleComplete(r)}
                  style={[styles.cta, r.completed_today && styles.ctaDone]}
                  testID={`ritual-complete-${r.id}`}
                >
                  <Ionicons
                    name={r.completed_today ? 'checkmark-done' : 'checkmark-outline'}
                    size={14}
                    color={r.completed_today ? COLORS.text : COLORS.bg}
                  />
                  <Text style={[styles.ctaText, r.completed_today && styles.ctaTextDone]}>
                    {r.completed_today ? 'Done today · tap to undo' : 'Mark today complete'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <CreateRitualModal
        visible={adding}
        onClose={() => setAdding(false)}
        onCreated={onCreated}
      />
    </SafeAreaView>
  );
}

function CreateRitualModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (r: Ritual) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [steps, setSteps] = useState<string[]>(['', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setEmoji('✨');
      setSteps(['', '', '']);
    }
  }, [visible]);

  const updateStep = (i: number, v: string) => {
    setSteps((s) => s.map((x, idx) => (idx === i ? v : x)));
  };

  const addStep = () => setSteps((s) => [...s, '']);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const filtered = steps.map((s) => s.trim()).filter(Boolean);
    if (!name.trim() || filtered.length === 0 || saving) return;
    setSaving(true);
    haptic.success();
    try {
      const created = await api.createRitual({
        name: name.trim(),
        steps: filtered,
        emoji: emoji,
      });
      onCreated(created);
      onClose();
    } catch {
      haptic.warning();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.center}
        >
          <Pressable style={modalStyles.sheet} onPress={() => {}} testID="create-ritual-modal">
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>New ritual</Text>
            <ScrollView style={{ maxHeight: 520 }}>
              <Text style={modalStyles.label}>EMOJI</Text>
              <View style={modalStyles.emojiRow}>
                {EMOJI_OPTIONS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => {
                      haptic.selection();
                      setEmoji(e);
                    }}
                    style={[
                      modalStyles.emojiBtn,
                      emoji === e && modalStyles.emojiActive,
                    ]}
                    testID={`ritual-emoji-${e}`}
                  >
                    <Text style={modalStyles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={modalStyles.label}>NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Morning ritual"
                placeholderTextColor={COLORS.textTertiary}
                style={modalStyles.input}
                testID="ritual-name-input"
              />
              <Text style={modalStyles.label}>STEPS</Text>
              {steps.map((s, i) => (
                <View key={i} style={modalStyles.stepInputRow}>
                  <TextInput
                    value={s}
                    onChangeText={(v) => updateStep(i, v)}
                    placeholder={`Step ${i + 1}`}
                    placeholderTextColor={COLORS.textTertiary}
                    style={[modalStyles.input, { flex: 1 }]}
                    testID={`ritual-step-${i}`}
                  />
                  {steps.length > 1 && (
                    <Pressable
                      onPress={() => removeStep(i)}
                      style={modalStyles.removeStep}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={14} color={COLORS.textSecondary} />
                    </Pressable>
                  )}
                </View>
              ))}
              {steps.length < 8 && (
                <Pressable onPress={addStep} style={modalStyles.addStep} testID="ritual-add-step">
                  <Ionicons name="add" size={14} color={COLORS.textSecondary} />
                  <Text style={modalStyles.addStepText}>Add step</Text>
                </Pressable>
              )}
            </ScrollView>
            <View style={modalStyles.actions}>
              <Pressable onPress={onClose} style={modalStyles.cancel}>
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={!name.trim() || saving}
                style={[
                  modalStyles.save,
                  (!name.trim() || saving) && { opacity: 0.5 },
                ]}
                testID="ritual-save"
              >
                <Text style={modalStyles.saveText}>
                  {saving ? 'Saving…' : 'Create ritual'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

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
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  scroll: { padding: SPACING.xl },
  overline: { color: COLORS.textTertiary, fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.8, marginBottom: SPACING.sm },
  sub: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: SPACING.xl },
  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: 8,
    alignItems: 'flex-start',
  },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600', marginTop: SPACING.sm },
  emptySub: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: SPACING.md },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
  },
  emptyCtaText: { color: COLORS.bg, fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardDone: { borderColor: COLORS.text },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  emoji: { fontSize: 24 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  cardTitleDone: { color: COLORS.text },
  stepCount: { color: COLORS.textTertiary, fontSize: 11, marginTop: 2 },
  stepsWrap: { gap: 8, marginBottom: SPACING.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  stepDotDone: { backgroundColor: COLORS.text },
  stepText: { color: COLORS.textSecondary, fontSize: 13 },
  stepTextDone: { color: COLORS.textTertiary, textDecorationLine: 'line-through' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
  },
  ctaDone: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ctaText: { color: COLORS.bg, fontSize: 12, fontWeight: '700' },
  ctaTextDone: { color: COLORS.text },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  center: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 44 : SPACING.xl,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.6,
    marginBottom: SPACING.lg,
  },
  label: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  emojiRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  emojiBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiActive: { borderColor: COLORS.text },
  emojiText: { fontSize: 18 },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  stepInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  removeStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  addStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addStepText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  save: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
  },
  saveText: { color: COLORS.bg, fontSize: 14, fontWeight: '700' },
});
