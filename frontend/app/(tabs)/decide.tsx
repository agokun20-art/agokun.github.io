import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import { api } from '../../src/api';

type Msg = { id: string; role: 'user' | 'assistant'; content: string };

const SESSION_ID = 'default-flow-session';

const SUGGESTION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  utensils: 'restaurant-outline',
  shirt: 'shirt-outline',
  map: 'map-outline',
  dumbbell: 'barbell-outline',
  moon: 'moon-outline',
  divide: 'receipt-outline',
};

function Orb() {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.15, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.7,
  }));
  return (
    <View style={styles.orbWrap} pointerEvents="none">
      <Animated.View style={[styles.orbGlow, animStyle]} />
      <View style={styles.orbCore} />
    </View>
  );
}

export default function DecideScreen() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      try {
        const [hist, sugg] = await Promise.all([
          api.chatHistory(SESSION_ID),
          api.chatSuggestions(),
        ]);
        setMessages(
          (hist.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
        setSuggestions(sugg.suggestions || []);
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await api.chat(SESSION_ID, trimmed);
      const reply: Msg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
      };
      setMessages((m) => [...m, reply]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Hmm, I couldn\'t reach my brain just now. Try again in a sec?',
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const clear = async () => {
    try {
      await api.clearChat(SESSION_ID);
    } catch {}
    setMessages([]);
  };

  const empty = messages.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-decide">
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(0,0,0,0)']}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <View style={styles.header}>
        <View>
          <Text style={styles.overline}>INSTANT DECISION ENGINE</Text>
          <Text style={styles.title}>Ask Flow</Text>
        </View>
        {!empty && (
          <Pressable onPress={clear} style={styles.clearBtn} testID="decide-clear-btn">
            <Ionicons name="refresh-outline" size={18} color={COLORS.textSecondary} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={10}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {empty ? (
            <Animated.View entering={FadeIn.duration(500)} style={styles.emptyWrap}>
              <Orb />
              <Text style={styles.emptyTitle}>What&apos;s on your mind?</Text>
              <Text style={styles.emptySub}>
                Tiny decisions, handled. Ask me anything.
              </Text>
            </Animated.View>
          ) : (
            messages.map((m, i) => (
              <Animated.View
                key={m.id}
                entering={
                  m.role === 'user'
                    ? FadeInUp.duration(260)
                    : FadeInUp.duration(320).delay(60)
                }
                style={[
                  styles.bubbleRow,
                  m.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowAssistant,
                ]}
              >
                {m.role === 'assistant' && (
                  <View style={styles.avatar}>
                    <Ionicons name="sparkles" size={13} color={COLORS.primary} />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      m.role === 'user' && { color: COLORS.bg },
                    ]}
                  >
                    {m.content}
                  </Text>
                </View>
              </Animated.View>
            ))
          )}
          {sending && (
            <View style={styles.typingRow}>
              <View style={styles.avatar}>
                <Ionicons name="sparkles" size={13} color={COLORS.primary} />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.typingText}>thinking…</Text>
              </View>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Suggestion chips */}
        {empty && suggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {suggestions.map((s, i) => (
              <Animated.View
                key={s.id}
                entering={FadeInDown.duration(400).delay(200 + i * 70)}
              >
                <Pressable
                  onPress={() => send(s.label)}
                  style={styles.chip}
                  testID={`suggestion-${s.id}`}
                >
                  <Ionicons
                    name={SUGGESTION_ICON[s.icon] || 'sparkles'}
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={styles.chipText}>{s.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything…"
              placeholderTextColor={COLORS.textTertiary}
              style={styles.input}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              testID="decide-input"
              editable={!sending}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim() || sending}
              style={[
                styles.sendBtn,
                (!input.trim() || sending) && { opacity: 0.4 },
              ]}
              testID="decide-send-btn"
            >
              <Ionicons name="arrow-up" size={20} color={COLORS.bg} />
            </Pressable>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  overline: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '600',
    marginBottom: 4,
  },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '600', letterSpacing: -0.8 },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  orbWrap: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  orbGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primaryGlow,
  },
  orbCore: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAssistant: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  typingRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
  },
  typingText: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic' },
  chipsRow: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: SPACING.sm,
  },
  chipText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  inputRow: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: SPACING.lg,
    paddingRight: 6,
    paddingVertical: 6,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
