import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../theme';
import { haptic } from '../haptics';
import { api } from '../api';

type Props = {
  onCreated: () => void;
  onManual: () => void;
};

export default function QuickAddInput({ onCreated, onManual }: Props) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [listening, setListening] = useState(false);

  const submit = async () => {
    const v = text.trim();
    if (!v || parsing) return;
    setParsing(true);
    haptic.light();
    try {
      const parsed = await api.parsePriority(v);
      await api.createPriority({
        title: parsed.title,
        time: parsed.time || undefined,
        category: parsed.category,
      });
      haptic.success();
      setText('');
      onCreated();
    } catch {
      haptic.warning();
    } finally {
      setParsing(false);
    }
  };

  const startVoice = () => {
    // Web Speech API (works on most Chromium/Safari; no-op elsewhere)
    const W: any = typeof window !== 'undefined' ? window : null;
    const Rec =
      W && (W.SpeechRecognition || W.webkitSpeechRecognition);
    if (!Rec) {
      haptic.warning();
      return;
    }
    try {
      const rec = new Rec();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setListening(true);
      haptic.medium();
      rec.onresult = (e: any) => {
        const said = e.results[0][0].transcript;
        setText((prev) => (prev ? prev + ' ' + said : said));
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const voiceSupported =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrap} testID="quick-add">
      <View style={styles.iconWrap}>
        <Ionicons name="sparkles" size={14} color={COLORS.text} />
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type or tap mic: 'call mom tomorrow 3pm'"
        placeholderTextColor={COLORS.textTertiary}
        style={styles.input}
        onSubmitEditing={submit}
        returnKeyType="done"
        testID="quick-add-input"
        editable={!parsing}
      />
      {voiceSupported && !text.trim() ? (
        <Pressable
          onPress={startVoice}
          hitSlop={8}
          style={[styles.iconBtn, listening && styles.iconBtnActive]}
          testID="quick-add-voice"
        >
          <Ionicons
            name={listening ? 'radio' : 'mic-outline'}
            size={16}
            color={listening ? COLORS.bg : COLORS.textSecondary}
          />
        </Pressable>
      ) : null}
      {text.trim() ? (
        <Pressable
          onPress={submit}
          hitSlop={8}
          style={styles.sendBtn}
          disabled={parsing}
          testID="quick-add-send"
        >
          {parsing ? (
            <ActivityIndicator size="small" color={COLORS.bg} />
          ) : (
            <Ionicons name="arrow-up" size={16} color={COLORS.bg} />
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={onManual}
          hitSlop={8}
          style={styles.iconBtn}
          testID="quick-add-manual"
        >
          <Ionicons name="add" size={18} color={COLORS.textSecondary} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingLeft: SPACING.md,
    paddingRight: 6,
    paddingVertical: 6,
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
