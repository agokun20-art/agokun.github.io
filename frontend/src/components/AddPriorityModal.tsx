import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme';

const CATEGORIES = ['Work', 'Personal', 'Health', 'Connect', 'Errand'];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (body: { title: string; time?: string; category?: string }) => Promise<void>;
  initial?: { title?: string; time?: string; category?: string };
  editing?: boolean;
};

export default function AddPriorityModal({ visible, onClose, onSave, initial, editing }: Props) {
  const [title, setTitle] = useState(initial?.title || '');
  const [time, setTime] = useState(initial?.time || '');
  const [category, setCategory] = useState(initial?.category || 'Work');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTitle(initial?.title || '');
      setTime(initial?.time || '');
      setCategory(initial?.category || 'Work');
    }
  }, [visible, initial]);

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), time: time.trim(), category });
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
          <Pressable style={styles.sheet} onPress={() => {}} testID="add-priority-modal">
            <View style={styles.handle} />
            <Text style={styles.title}>{editing ? 'Edit priority' : 'New priority'}</Text>
            <Text style={styles.sublabel}>WHAT</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Finish Q2 deck"
              placeholderTextColor={COLORS.textTertiary}
              style={styles.input}
              autoFocus
              testID="priority-title-input"
            />
            <Text style={styles.sublabel}>WHEN (optional)</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="e.g. 10:00 AM"
              placeholderTextColor={COLORS.textTertiary}
              style={styles.input}
              testID="priority-time-input"
            />
            <Text style={styles.sublabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.chip, active && styles.chipActive]}
                    testID={`priority-category-${c}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelBtn} testID="priority-cancel-btn">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={!title.trim() || saving}
                style={[styles.saveBtn, (!title.trim() || saving) && { opacity: 0.5 }]}
                testID="priority-save-btn"
              >
                <Ionicons name="checkmark" size={18} color={COLORS.bg} />
                <Text style={styles.saveText}>{editing ? 'Save' : 'Add'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  center: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
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
  sublabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: SPACING.md,
  },
  chipRow: { marginBottom: SPACING.lg },
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
  chipTextActive: { color: COLORS.bg, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
    flexDirection: 'row',
    gap: 6,
  },
  saveText: { color: COLORS.bg, fontSize: 14, fontWeight: '700' },
});
