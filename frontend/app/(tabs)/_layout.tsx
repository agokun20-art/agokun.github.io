import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SPACING } from '../../src/theme';

type TabDef = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { name: 'home', label: 'Home', icon: 'sunny-outline' },
  { name: 'flow', label: 'Flow', icon: 'grid-outline' },
  { name: 'decide', label: 'Decide', icon: 'sparkles' },
  { name: 'wind-down', label: 'Evening', icon: 'moon-outline' },
  { name: 'settings', label: 'You', icon: 'person-outline' },
];

function FabIcon({ focused }: { focused: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1,
      true
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  return (
    <View style={styles.fabWrap}>
      <Animated.View style={[styles.fabGlow, style]} />
      <View style={[styles.fab, focused && styles.fabActive]}>
        <Ionicons name="sparkles" size={24} color={COLORS.bg} />
      </View>
    </View>
  );
}

function TabButton({
  tab,
  focused,
  onPress,
}: {
  tab: TabDef;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1 : 0.92);
  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, { damping: 14, stiffness: 120 });
  }, [focused, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (tab.name === 'decide') {
    return (
      <Pressable
        onPress={onPress}
        style={styles.tabItem}
        testID={`nav-${tab.name}-tab`}
        hitSlop={8}
      >
        <FabIcon focused={focused} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      testID={`nav-${tab.name}-tab`}
      hitSlop={8}
    >
      <Animated.View style={[styles.tabInner, style]}>
        <Ionicons
          name={tab.icon}
          size={22}
          color={focused ? COLORS.primary : COLORS.textTertiary}
        />
        <Text
          style={[styles.tabLabel, focused && { color: COLORS.primary }]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: COLORS.bg },
      }}
      tabBar={({ state, navigation }) => (
        <View style={styles.tabBarOuter} testID="tab-bar">
          <View style={styles.tabBar}>
            {TABS.map((tab, idx) => {
              const focused = state.index === idx;
              return (
                <TabButton
                  key={tab.name}
                  tab={tab}
                  focused={focused}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.selectionAsync().catch(() => {});
                    }
                    navigation.navigate(tab.name);
                  }}
                />
              );
            })}
          </View>
        </View>
      )}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 22 : 14,
    paddingTop: 8,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  fabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  fabGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryGlow,
    opacity: 0.55,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  fabActive: {
    backgroundColor: COLORS.primaryActive,
  },
});
