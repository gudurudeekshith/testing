import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { apiRequest } from '../../services/api';

export default function MyRegistrationsScreen() {
  const { colors } = useTheme();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<any>('/registrations/me');
      if (res.success) {
        setRegistrations(res.data || []);
      } else {
        setError(res.message || 'Unable to load tickets.');
      }
    } catch (e: any) {
      setError(e.message || 'Unable to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchRegistrations();
    }, [fetchRegistrations])
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

  const renderRegistration = ({ item }: { item: any }) => {
    const isCancelled = item.status === 'cancelled';
    const event = item.event;
    if (!event) return null;

    return (
      <TouchableOpacity
        style={[
          styles.ticketCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: isCancelled ? 0.6 : 1,
          },
        ]}
        onPress={() =>
          router.push({
            pathname: '/(main)/event-details',
            params: { id: event.id || event._id },
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.ticketHeader}>
          <Text style={[styles.eventTitle, { color: colors.white }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text
            style={[
              styles.statusBadge,
              {
                backgroundColor: isCancelled ? '#FFD3D3' : '#D3F3E2',
                color: isCancelled ? colors.danger : colors.success,
              },
            ]}
          >
            {isCancelled ? 'Cancelled' : 'Confirmed'}
          </Text>
        </View>

        <View style={styles.ticketBody}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatDate(event.date)} at {event.startTime}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {event.venue}
            </Text>
          </View>
        </View>

        <View style={styles.ticketFooter}>
          <Text style={[styles.bookingDateText, { color: colors.textMuted }]}>
            Booked on: {formatDate(item.registeredAt)}
          </Text>
          <Ionicons name="qr-code-outline" size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.white }]} numberOfLines={1}>
          My Tickets
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
            onPress={fetchRegistrations}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : registrations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="ticket-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.white }]}>No active tickets</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Events you register for will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={registrations}
          keyExtractor={(item) => (item.id || item._id).toString()}
          renderItem={renderRegistration}
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
  ticketCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventTitle: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  ticketBody: {
    marginBottom: 12,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  metaText: { fontSize: 13 },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  bookingDateText: { fontSize: 11 },
});
