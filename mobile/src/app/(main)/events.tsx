import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { apiRequest } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';

const DATE_CHIPS = ['Upcoming', 'Today', 'This Week', 'This Month', 'Past'];
const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Seminar', 'Other'];

export default function EventsScreen() {
  const { colors } = useTheme();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDateChip, setSelectedDateChip] = useState('Upcoming');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = `?date=${selectedDateChip.toLowerCase().replace(' ', '-')}`;
      if (selectedCategory !== 'All') {
        q += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      if (search) {
        q += `&search=${encodeURIComponent(search)}`;
      }
      const res = await apiRequest<any>(`/events${q}`);
      if (res.success) {
        setEvents(res.data || []);
      } else {
        setError(res.message || 'Unable to load events.');
      }
    } catch (e: any) {
      setError(e.message || 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  }, [selectedDateChip, selectedCategory, search]);

  const checkRole = async () => {
    const user = await getCurrentUser();
    setIsAdmin(user?.role === 'admin');
  };

  useFocusEffect(
    useCallback(() => {
      void fetchEvents();
      void checkRole();
    }, [fetchEvents])
  );

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Date unknown';
    }
  };

  const renderEvent = ({ item }: { item: any }) => {
    const isCancelled = item.status === 'cancelled';
    const isFull = item.capacity && item.registrationsCount >= item.capacity;

    return (
      <TouchableOpacity
        style={[
          styles.eventCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: isCancelled ? 0.7 : 1,
          },
        ]}
        onPress={() =>
          router.push({
            pathname: '/(main)/event-details',
            params: { id: item.id || item._id },
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.eventTitle, { color: colors.white }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text
            style={[
              styles.eventCategory,
              {
                color: colors.primary,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {item.category}
          </Text>
        </View>

        <Text style={[styles.eventDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatDate(item.date)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.startTime}
            </Text>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.venue}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.capacity
                ? `${item.registrationsCount} / ${item.capacity} booked`
                : `${item.registrationsCount} registered`}
            </Text>
          </View>
        </View>

        {/* STATUS FOOTER CHIPS */}
        <View style={styles.cardFooter}>
          {item.clubName || item.club?.name ? (
            <Text style={[styles.clubTag, { color: colors.textMuted }]}>
              Hosted by: {item.clubName || item.club?.name}
            </Text>
          ) : (
            <View />
          )}

          {isCancelled ? (
            <Text style={[styles.badge, { backgroundColor: '#FFD3D3', color: colors.danger }]}>
              Cancelled
            </Text>
          ) : isFull ? (
            <Text style={[styles.badge, { backgroundColor: '#FFEBD3', color: '#FF8A00' }]}>
              Full
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.white }]}>Explore Events</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Discover campus schedules</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(main)/my-registrations')}
          style={[
            styles.registrationsBtn,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons name="ticket" size={14} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.registrationsBtnText, { color: colors.white }]}>My Tickets</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search campus events..."
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

      {/* DATE FILTERS */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={DATE_CHIPS}
        keyExtractor={(item) => item}
        style={styles.dateChipsList}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedDateChip(item)}
            style={[
              styles.chip,
              {
                backgroundColor: selectedDateChip === item ? colors.primary : colors.surface,
                borderColor: selectedDateChip === item ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: selectedDateChip === item ? colors.white : colors.textSecondary,
                  fontWeight: selectedDateChip === item ? '600' : '400',
                },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* CATEGORIES */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item}
        style={styles.categoryChipsList}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            key={item}
            onPress={() => setSelectedCategory(item)}
            style={[
              styles.chip,
              {
                backgroundColor: selectedCategory === item ? colors.primary : colors.surface,
                borderColor: selectedCategory === item ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: selectedCategory === item ? colors.white : colors.textSecondary,
                  fontWeight: selectedCategory === item ? '600' : '400',
                },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

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
            onPress={fetchEvents}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.white }]}>No events found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Try adjusting your search query or filters.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => (item.id || item._id).toString()}
          renderItem={renderEvent}
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
  registrationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  registrationsBtnText: { fontSize: 13, fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, height: '100%', paddingVertical: 0 },
  dateChipsList: { flexGrow: 0, height: 38, marginBottom: 8 },
  categoryChipsList: { flexGrow: 0, height: 38, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 34,
  },
  chipText: { fontSize: 12 },
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
  eventCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 8 },
  eventCategory: {
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', width: '48%' },
  metaText: { fontSize: 12 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  clubTag: { fontSize: 12 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
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
