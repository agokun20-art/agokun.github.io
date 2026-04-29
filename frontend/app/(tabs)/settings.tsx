import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import { api } from '../../src/api';

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.profile();
        setProfile(res);
        setNameDraft(res.name);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = async (patch: any) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    setSaving(true);
    try {
      await api.updateProfile(next);
    } catch (e) {
      console.log(e);
    } finally {
      setSaving(false);
    }
  };

  const saveName = () => {
    const trimmed = nameDraft.trim() || 'Friend';
    update({ name: trimmed, greeting_name: trimmed });
    setEditingName(false);
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-settings">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.overline}>PROFILE</Text>
          <Text style={styles.title}>You</Text>
        </Animated.View>

        {/* Avatar */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.avatarCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarInitial}>
                {(profile.name || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                onSubmitEditing={saveName}
                style={styles.nameInput}
                placeholder="Your name"
                placeholderTextColor={COLORS.textTertiary}
                autoFocus
                testID="name-input"
              />
              <Pressable
                onPress={saveName}
                style={styles.nameSave}
                testID="name-save-btn"
              >
                <Ionicons name="checkmark" size={18} color={COLORS.bg} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditingName(true)} testID="edit-name-btn">
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.nameEdit}>Tap to edit</Text>
            </Pressable>
          )}
          {!profile.pro_member && (
            <View style={styles.proTag}>
              <Ionicons name="diamond-outline" size={12} color={COLORS.primary} />
              <Text style={styles.proTagText}>Free plan</Text>
            </View>
          )}
        </Animated.View>

        {/* Privacy */}
        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.section}>
          <Text style={styles.sectionLabel}>PRIVACY FIRST</Text>
          <View style={styles.sectionCard}>
            <Row
              icon="people-circle-outline"
              title="Family sharing"
              subtitle="Share calendar & priorities with family"
              testID="switch-family-sharing"
              value={profile.family_sharing}
              onChange={(v) => update({ family_sharing: v })}
            />
            <Row
              icon="brain"
              iconIsIonicon={false}
              title="AI training"
              subtitle="Let Flow learn your habits on-device"
              testID="switch-ai-training"
              value={profile.ai_training}
              onChange={(v) => update({ ai_training: v })}
            />
            <Row
              icon="notifications-outline"
              title="Daily notifications"
              subtitle="Morning brief & evening recap"
              testID="switch-notifications"
              value={profile.notifications}
              onChange={(v) => update({ notifications: v })}
              last
            />
          </View>
        </Animated.View>

        {/* Experience */}
        <Animated.View entering={FadeInDown.duration(500).delay(220)} style={styles.section}>
          <Text style={styles.sectionLabel}>EXPERIENCE</Text>
          <View style={styles.sectionCard}>
            <Row
              icon="mic-outline"
              title="Voice input"
              subtitle="Tap & hold to talk to Flow"
              testID="switch-voice"
              value={profile.voice_enabled}
              onChange={(v) => update({ voice_enabled: v })}
            />
            <LinkRow
              icon="moon-outline"
              title="Theme"
              value={profile.theme === 'dark' ? 'Dark' : 'Light'}
              testID="theme-row"
            />
            <LinkRow
              icon="language-outline"
              title="Language"
              value="English (US)"
              testID="language-row"
              last
            />
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.duration(500).delay(280)} style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.sectionCard}>
            <LinkRow
              icon="bar-chart-outline"
              title="Insights & streaks"
              testID="insights-row"
              onPress={() => router.push('/insights')}
            />
            <LinkRow
              icon="download-outline"
              title="Export your data"
              testID="export-row"
              onPress={async () => {
                try {
                  const data = await api.exportData();
                  const json = JSON.stringify(data, null, 2);
                  if (typeof window !== 'undefined' && (window as any).Blob) {
                    const blob = new (window as any).Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `flow-export-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                } catch {}
              }}
            />
            <LinkRow
              icon="mail-outline"
              title="Contact support"
              value="hello@flowapp.daily"
              testID="support-row"
              onPress={() => {
                if (typeof window !== 'undefined') {
                  (window as any).location.href = 'mailto:hello@flowapp.daily';
                }
              }}
            />
            <LinkRow
              icon="shield-checkmark-outline"
              title="Privacy policy"
              testID="privacy-row"
              onPress={() => router.push('/privacy')}
            />
            <LinkRow
              icon="document-text-outline"
              title="Terms of service"
              testID="terms-row"
              onPress={() => router.push('/terms')}
            />
            <LinkRow
              icon="information-circle-outline"
              title="Version"
              value="1.1.0"
              testID="version-row"
              last
            />
          </View>
        </Animated.View>

        {/* Danger zone */}
        <Animated.View entering={FadeInDown.duration(500).delay(320)} style={styles.section}>
          <Text style={styles.sectionLabel}>DANGER ZONE</Text>
          <Pressable
            onPress={async () => {
              const go = typeof window !== 'undefined' && window.confirm
                ? window.confirm('Delete all your Flow data and restart onboarding?')
                : true;
              if (!go) return;
              await api.resetAll();
              router.replace('/onboarding');
            }}
            style={styles.resetBtn}
            testID="reset-data-btn"
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.resetText}>Reset all data</Text>
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.duration(500).delay(340)} style={styles.footer}>
          <Text style={styles.footerTag}>Flow · Life, but easier.</Text>
          {saving && (
            <Text style={styles.savingText}>saving…</Text>
          )}
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  iconIsIonicon = true,
  title,
  subtitle,
  value,
  onChange,
  last,
  testID,
}: {
  icon: string;
  iconIsIonicon?: boolean;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>
        {iconIsIonicon ? (
          <Ionicons name={icon as any} size={18} color={COLORS.textSecondary} />
        ) : (
          <Ionicons name="sparkles-outline" size={18} color={COLORS.textSecondary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#2C3447', true: COLORS.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#2C3447"
        testID={testID}
      />
    </View>
  );
}

function LinkRow({
  icon,
  title,
  value,
  last,
  testID,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value?: string;
  last?: boolean;
  testID?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[styles.row, !last && styles.rowBorder]}
      testID={testID}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      {!!value && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
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
  },
  avatarCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: COLORS.primary,
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -1,
  },
  name: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  nameEdit: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  nameInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 16,
    minWidth: 180,
  },
  nameSave: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  proTagText: { color: COLORS.primary, fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  section: { marginBottom: SPACING.xl },
  sectionLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: SPACING.md,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  rowSubtitle: { color: COLORS.textTertiary, fontSize: 12, marginTop: 2 },
  rowValue: { color: COLORS.textSecondary, fontSize: 13, marginRight: 4 },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: 6,
  },
  footerTag: {
    color: COLORS.textTertiary,
    fontSize: 12,
    letterSpacing: 1,
  },
  savingText: {
    color: COLORS.primary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  resetText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
});
