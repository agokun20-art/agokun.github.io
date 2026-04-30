import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../src/theme';
import { api } from '../src/api';
import { haptic } from '../src/haptics';

type Entry = { id: string; content: string; reflection?: string | null; created_at: string };

const PROMPTS = [
  'What went well today?',
  'What drained you?',
  'What surprised you?',
  'What do you want more of tomorrow?',
  'A small moment you\'d remember?',
];

export default function Journal() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState(PROMPTS[0]);

  const load = useCallback(async () => {
    try {
      const r = await api.listJournal(50);
      setEntries(r.entries || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, [load]);

  const save = async () => {
    const v = content.trim();
    if (!v || saving) return;
    setSaving(true);
    haptic.medium();
    try {
      const created = await api.createJournal(v);
      setEntries((es) => [created, ...es]);
      setContent('');
      haptic.success();
    } catch {
      haptic.warning();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    haptic.light();
    setEntries((es) => es.filter((e) => e.id !== id));
    try {
      await api.deleteJournal(id);
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-journal">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="journal-back" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Journal</Text>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={10}
      >
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
          {/* Composer */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.composer}>
            <Text style={styles.promptLabel}>PROMPT</Text>
            <Text style={styles.promptText}>{prompt}</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="A few honest lines…"
              placeholderTextColor={COLORS.textTertiary}
              style={styles.input}
              multiline
              testID="journal-input"
            />
            <View style={styles.composerActions}>
              <Text style={styles.counter}>{content.length}/4000</Text>
              <Pressable
                onPress={save}
                disabled={!content.trim() || saving}
                style={[styles.saveBtn, (!content.trim() || saving) && { opacity: 0.5 }]}
                testID="journal-save"
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.bg} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={14} color={COLORS.bg} />
                    <Text style={styles.saveText}>Write & reflect</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={28} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Your first page.</Text>
              <Text style={styles.emptySub}>
                Writing a few lines helps Flow mirror patterns back to you over time.
              </Text>
            </View>
          ) : (
            entries.map((e, i) => (
              <Animated.View
                key={e.id}
                entering={FadeInDown.duration(400).delay(i * 40)}
                layout={Layout.springify()}
                style={styles.entry}
                testID={`journal-entry-${e.id}`}
              >
                <View style={styles.entryHead}>
                  <Text style={styles.entryDate}>{formatWhen(e.created_at)}</Text>
                  <Pressable
                    onPress={() => remove(e.id)}
                    hitSlop={8}
                    testID={`journal-delete-${e.id}`}
                  >
                    <Ionicons name="close" size={14} color={COLORS.textTertiary} />
                  </Pressable>
                </View>
                <Text style={styles.entryContent}>{e.content}</Text>
                {!!e.reflection && (
                  <View style={styles.reflectRow}>
                    <View style={styles.reflectIcon}>
                      <Ionicons name="sparkles" size={11} color={COLORS.bg} />
                    </View>
                    <Text style={styles.reflectText}>{e.reflection}</Text>
                  </View>
                )}
              </Animated.View>
            ))
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const same = d.toDateString() === now.toDateString();
    if (same) {
      return `Today · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
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
  composer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  promptLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  promptText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: { color: COLORS.textTertiary, fontSize: 11 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.text,
  },
  saveText: { color: COLORS.bg, fontSize: 13, fontWeight: '700' },
  empty: {
    paddingVertical: SPACING.xxl,
    alignItems: 'flex-start',
    gap: 6,
  },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600', marginTop: SPACING.sm },
  emptySub: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  entry: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  entryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  entryDate: {
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  entryContent: { color: COLORS.text, fontSize: 14, lineHeight: 22, marginBottom: SPACING.md },
  reflectRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reflectIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  reflectText: { flex: 1, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
});
