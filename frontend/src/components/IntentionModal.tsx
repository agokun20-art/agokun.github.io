import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme';
import { haptic } from '../haptics';

const SUGGESTIONS = ['Focused', 'Kind', 'Bold', 'Patient', 'Curious', 'Gentle', 'Open', 'Playful'];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (word: string, note: string) => Promise<void>;
  initialWord?: string;
  initialNote?: string;
};

export default function IntentionModal({
  visible,
  onClose,
  onSave,
  initialWord = '',
  initialNote = '',
}: Props) {
  const [word, setWord] = useState(initialWord);
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setWord(initialWord);
      setNote(initialNote);
    }
  }, [visible, initialWord, initialNote]);

  const handleSave = async () => {
    if (!word.trim() || saving) return;
    setSaving(true);
    haptic.success();
    try {
      await onSave(word.trim(), note.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}
        >
          <Pressable style={styles.sheet} onPress={() => {}} testID="intention-modal">
            <View style={styles.handle} />
            <Animated.View entering={FadeIn.duration(300)}>
              <Text style={styles.overline}>INTENTION · TODAY</Text>
              <Text style={styles.title}>One word, then begin.</Text>
              <Text style={styles.sub}>
                Pick a word that&apos;ll quietly shape how you move today.
              </Text>
            </Animated.View>

            <TextInput
              value={word}
              onChangeText={setWord}
              placeholder="e.g. Focused"
              placeholderTextColor={COLORS.textTertiary}
              style={styles.wordInput}
              autoFocus
              maxLength={24}
              testID="intention-word-input"
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {SUGGESTIONS.map((w, i) => (
                <Animated.View key={w} entering={FadeInDown.duration(400).delay(i * 40)}>
                  <Pressable
                    onPress={() => {
                      haptic.selection();
                      setWord(w);
                    }}
                    style={[styles.chip, word === w && styles.chipActive]}
                    testID={`intention-chip-${w}`}
                  >
                    <Text style={[styles.chipText, word === w && styles.chipTextActive]}>
                      {w}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>

            <Text style={styles.smallLabel}>NOTE (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="One sentence to remind yourself"
              placeholderTextColor={COLORS.textTertiary}
              style={styles.noteInput}
              maxLength={140}
              testID="intention-note-input"
            />

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancel} testID="intention-cancel">
                <Text style={styles.cancelText}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={!word.trim() || saving}
                style={[styles.save, (!word.trim() || saving) && { opacity: 0.5 }]}
                testID="intention-save"
              >
                <Ionicons name="checkmark" size={16} color={COLORS.bg} />
                <Text style={styles.saveText}>Set intention</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  center: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 44 : SPACING.xxl,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  overline: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.7,
    marginBottom: SPACING.sm,
  },
  sub: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: SPACING.lg },
  wordInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.4,
    marginBottom: SPACING.md,
  },
  chipRow: { marginBottom: SPACING.lg, marginHorizontal: -SPACING.xxl, paddingHorizontal: SPACING.xxl },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  chipActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: COLORS.bg, fontWeight: '700' },
  smallLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  noteInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  actions: { flexDirection: 'row', gap: SPACING.md },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
  },
  saveText: { color: COLORS.bg, fontSize: 14, fontWeight: '700' },
});
