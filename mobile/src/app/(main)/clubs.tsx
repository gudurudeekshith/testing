import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
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
import { getCurrentUser } from '../../utils/auth';

const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Other'];

export default function ClubsScreen() {
  const { colors } = useTheme();
  const [clubsRaw, setClubsRaw] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<any>('/clubs');
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : [];
        setClubsRaw(items);
        setClubs(items);
      } else {
        setError(res.message || 'Unable to load clubs.');
      }
    } catch (e: any) {
      setError(e.message || 'Unable to load clubs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkRole = async () => {
    const user = await getCurrentUser();
    setIsAdmin(user?.role === 'admin');
  };

  useFocusEffect(
    useCallback(() => {
      void fetchClubs();
      void checkRole();
    }, [fetchClubs])
  );

  useEffect(() => {
    const q = (search || '').trim().toLowerCase();
    const filtered = clubsRaw.filter((c) => {
      const cat = (c.category || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();

      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Technical') {
          const techTerms = ['coding', 'tech', 'technology', 'robot', 'innovation', 'computer', 'science'];
          if (!techTerms.some((t) => cat.includes(t) || name.includes(t) || desc.includes(t))) return false;
        } else if (selectedCategory === 'Cultural') {
          const cult = ['music', 'culture', 'art', 'creative', 'performance', 'dance', 'drama'];
          if (!cult.some((t) => cat.includes(t) || name.includes(t) || desc.includes(t))) return false;
        } else if (selectedCategory === 'Sports') {
          const sporty = ['sport', 'athletic', 'cricket', 'football', 'basketball'];
          if (!sporty.some((t) => cat.includes(t) || name.includes(t) || desc.includes(t))) return false;
        } else if (selectedCategory === 'Other') {
          const techTerms = ['coding', 'tech', 'technology', 'robot', 'innovation', 'computer', 'science'];
          const cult = ['music', 'culture', 'art', 'creative', 'performance', 'dance', 'drama'];
          const sporty = ['sport', 'athletic', 'cricket', 'football', 'basketball'];
          if (techTerms.some((t) => cat.includes(t) || name.includes(t) || desc.includes(t))) return false;
          if (cult.some((t) => cat.includes(t) || name.includes(t) || desc.includes(t))) return false;
          if (sporty.some((t) => cat.includes(t) || name.includes(t) || desc.includes(t))) return false;
        }
      }

      if (!q) return true;
      return name.includes(q) || cat.includes(q) || desc.includes(q);
    });
    setClubs(filtered);
  }, [search, selectedCategory, clubsRaw]);

  const renderClub = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.clubCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={() =>
        router.push({
          pathname: '/(main)/club-details',
          params: { id: item.id || item._id },
        })
      }
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
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.white }]}>Explore Clubs</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Campus communities & groups</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(main)/saved-clubs')}
          style={[
            styles.savedClubsBtn,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons name="heart" size={14} color={colors.danger} style={{ marginRight: 4 }} />
          <Text style={[styles.savedClubsBtnText, { color: colors.white }]}>Saved</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search campus clubs..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: colors.white }]}
          placeholderTextColor={colors.textMuted}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* CATEGORIES */}
      <View style={styles.chipsRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.chip,
              {
                backgroundColor: selectedCategory === cat ? colors.primary : colors.surface,
                borderColor: selectedCategory === cat ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: selectedCategory === cat ? colors.white : colors.textSecondary,
                  fontWeight: selectedCategory === cat ? '600' : '400',
                },
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
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
            onPress={fetchClubs}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : clubs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.white }]}>No clubs found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Try adjusting your search query or filters.
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

      {/* ADMIN FLOATING ACTION BUTTON */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.adminFab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(main)/admin-dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  savedClubsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  savedClubsBtnText: { fontSize: 13, fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, height: '100%', paddingVertical: 0 },
  chipsRow: { flexDirection: 'row', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 13 },
  loadingRow: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  errorText: { fontSize: 14, marginVertical: 12, textAlign: 'center' },
  retryButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { fontSize: 13, fontWeight: '600' },
  emptyBox: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  listContainer: { paddingBottom: 80 },
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
  adminFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
