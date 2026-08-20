import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { apiRequest } from '../../services/api';
const isValidObjectId = (val: string | undefined | null): boolean => {
  if (!val) return false;
  return /^[0-9a-fA-F]{24}$/.test(val);
};

export default function SavedClubsScreen() {
  const { colors } = useTheme();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedClubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<any>('/clubs/saved');
      if (res.success) {
        setClubs(res.data || []);
      } else {
        setError(res.message || 'Unable to load saved clubs.');
      }
    } catch (e: any) {
      setError(e.message || 'Unable to load saved clubs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchSavedClubs();
    }, [fetchSavedClubs])
  );

  const renderClub = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.clubCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={() => {
        const clubId = item.id || item._id;
        if (!isValidObjectId(clubId)) {
          console.error('Invalid club details click in Saved list. Club:', item);
          return;
        }
        router.push({
          pathname: '/(main)/club-details',
          params: { id: clubId },
        });
      }}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.clubLogoPlaceholder,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.clubLogoImage} />
        ) : (
          <Ionicons name="people-outline" size={24} color={colors.primary} />
        )}
      </View>
      <View style={styles.clubInfo}>
        <Text style={[styles.clubName, { color: colors.white }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.clubCategory, { color: colors.textSecondary }]}>
          {item.category}
        </Text>
        <View style={styles.clubMembersRow}>
          <Ionicons name="people-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.clubMembersCount, { color: colors.textMuted }]}>
            {item.membersCount || 0} members
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.white }]} numberOfLines={1}>
          Saved Clubs
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* LIST/LOADER */}
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            onPress={fetchSavedClubs}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : clubs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="heart-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.white }]}>No saved clubs</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Clubs you save will appear here for easy access.
          </Text>
        </View>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => (item.id || item._id).toString()}
          renderItem={renderClub}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  loadingRow: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    margin: 16,
  },
  errorText: { fontSize: 14, marginVertical: 12, textAlign: 'center' },
  retryButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { fontSize: 13, fontWeight: '600' },
  emptyBox: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  listContainer: { padding: 16, paddingBottom: 40 },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  clubLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clubLogoImage: { width: '100%', height: '100%', borderRadius: 11 },
  clubInfo: { flex: 1 },
  clubName: { fontSize: 15, fontWeight: '700' },
  clubCategory: { fontSize: 12, marginTop: 2 },
  clubMembersRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  clubMembersCount: { fontSize: 12 },
});
