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

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Fun', 'Health', 'Other'];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (body: { amount: number; category: string; note?: string }) => Promise<void>;
};

export default function AddExpenseModal({ visible, onClose, onSave }: Props) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setAmount('');
      setCategory('Food');
      setNote('');
    }
  }, [visible]);

  const num = parseFloat(amount.replace(',', '.')) || 0;
  const disabled = num <= 0 || saving;

  const handleSave = async () => {
    if (disabled) return;
    setSaving(true);
    try {
      await onSave({ amount: num, category, note: note.trim() });
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
          <Pressable style={styles.sheet} onPress={() => {}} testID="add-expense-modal">
            <View style={styles.handle} />
            <Text style={styles.title}>Add expense</Text>

            <Text style={styles.sublabel}>AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                autoFocus
                testID="expense-amount-input"
              />
            </View>

            <Text style={styles.sublabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.chip, active && styles.chipActive]}
                    testID={`expense-category-${c}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sublabel}>NOTE (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Coffee with Maya"
              placeholderTextColor={COLORS.textTertiary}
              style={styles.input}
              testID="expense-note-input"
            />

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelBtn} testID="expense-cancel-btn">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={disabled}
                style={[styles.saveBtn, disabled && { opacity: 0.5 }]}
                testID="expense-save-btn"
              >
                <Ionicons name="checkmark" size={18} color={COLORS.bg} />
                <Text style={styles.saveText}>Add ${num ? num.toFixed(2) : '0.00'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  currency: { color: COLORS.textSecondary, fontSize: 28, marginRight: 4 },
  amountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -1,
    paddingVertical: 12,
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
