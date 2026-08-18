import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { useTheme } from '../../theme/ThemeContext';

const themeOptions = [
  { key: 'system', label: 'System Default', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
] as const;

export default function SettingsScreen() {
  const { mode, setMode, isDark } = useTheme();
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const onThemeSelect = async (nextMode: 'system' | 'light' | 'dark') => {
    await setMode(nextMode);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { logout } = await import('../../utils/auth');
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const themeColors = isDark
    ? {
        background: '#05070B',
        surface: '#0F1621',
        surfaceAlt: '#101722',
        text: '#FFFFFF',
        muted: '#94A3B8',
        border: '#202B3A',
        primary: '#5AA9FF',
      }
    : {
        background: '#F5F7FB',
        surface: '#FFFFFF',
        surfaceAlt: '#EEF3FA',
        text: '#111827',
        muted: '#5B6473',
        border: '#D9E1EC',
        primary: '#1479E8',
      };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={themeColors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>
        </View>

        <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Appearance</Text>

          {themeOptions.map((option) => {
            const selected = mode === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionRow,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: selected ? themeColors.surfaceAlt : 'transparent',
                  },
                ]}
                onPress={() => onThemeSelect(option.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIcon, { backgroundColor: selected ? `${themeColors.primary}22` : themeColors.surfaceAlt }]}> 
                  <Ionicons name={option.icon as any} size={18} color={selected ? themeColors.primary : themeColors.muted} />
                </View>

                <Text style={[styles.optionText, { color: themeColors.text }]}>{option.label}</Text>

                {selected ? <Ionicons name="checkmark-circle" size={20} color={themeColors.primary} /> : <View style={styles.radioOuter}><View style={styles.radioInner} /></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Account</Text>

          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(main)/profile')} activeOpacity={0.8}>
            <View style={styles.actionIcon}><Ionicons name="person-outline" size={18} color={themeColors.primary} /></View>
            <Text style={[styles.actionText, { color: themeColors.text }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(main)/help-support')} activeOpacity={0.8}>
            <View style={styles.actionIcon}><Ionicons name="help-circle-outline" size={18} color={themeColors.primary} /></View>
            <Text style={[styles.actionText, { color: themeColors.text }]}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(main)/rate-feedback')} activeOpacity={0.8}>
            <View style={styles.actionIcon}><Ionicons name="star-outline" size={18} color={themeColors.primary} /></View>
            <Text style={[styles.actionText, { color: themeColors.text }]}>Rate & Feedback</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Application</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: themeColors.muted }]}>Version</Text>
            <Text style={[styles.infoValue, { color: themeColors.text }]}>{appVersion}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: '#FF5C5C' }]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(90,169,255,0.12)',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  section: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#7E899B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5AA9FF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.25)',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(90,169,255,0.12)',
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
