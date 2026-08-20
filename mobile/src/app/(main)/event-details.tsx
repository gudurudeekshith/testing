import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { apiRequest } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';

const isValidObjectId = (val: string | undefined | null): boolean => {
  if (!val) return false;
  return /^[0-9a-fA-F]{24}$/.test(val);
};

export default function EventDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration states
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchEventDetails = useCallback(async () => {
    if (!isValidObjectId(id)) {
      setError('Invalid event ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<any>(`/events/${id}`);
      if (res.success) {
        setEvent(res.data || null);
      } else {
        setError(res.message || 'Unable to load event details.');
      }
    } catch (e: any) {
      setError(e.message || 'Unable to load event details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkRegistrationStatus = useCallback(async () => {
    if (!isValidObjectId(id)) return;
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (!user || user.role === 'admin') {
        setIsRegistered(false);
        return;
      }

      const res = await apiRequest<any>('/registrations/me');
      if (res.success) {
        const list = res.data || [];
        setIsRegistered(list.some((r: any) => r.event?.id === id && r.status === 'registered'));
      }
    } catch (e) {
      console.error('Check registration error:', e);
      setIsRegistered(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!isValidObjectId(id)) {
        setError('Invalid event ID');
        setLoading(false);
        return;
      }
      void fetchEventDetails();
      void checkRegistrationStatus();
    }, [id, fetchEventDetails, checkRegistrationStatus])
  );

  const handleRegisterToggle = async () => {
    if (registering || !id || !event) return;
    setRegistering(true);

    try {
      if (isRegistered) {
        // Cancel registration confirmation
        Alert.alert(
          'Cancel Ticket',
          'Are you sure you want to cancel your seat for this event?',
          [
            { text: 'No', style: 'cancel', onPress: () => setRegistering(false) },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                try {
                  const res = await apiRequest<any>(
                    `/registrations/events/${id}/register/cancel`,
                    { method: 'PATCH' }
                  );
                  if (res.success) {
                    setIsRegistered(false);
                    void fetchEventDetails();
                    Alert.alert('Cancelled', 'Your seat registration has been cancelled.');
                  }
                } catch (err: any) {
                  Alert.alert('Error', err.message || 'Unable to cancel registration.');
                } finally {
                  setRegistering(false);
                }
              },
            },
          ]
        );
      } else {
        const res = await apiRequest<any>(`/registrations/events/${id}/register`, {
          method: 'POST',
        });
        if (res.success) {
          setIsRegistered(true);
          void fetchEventDetails();
          Alert.alert('Success!', 'Your seat registration is confirmed. View details under My Tickets.');
          setRegistering(false);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to book seat.');
      setRegistering(false);
    }
  };

  const openMap = () => {
    if (!event || event.latitude === undefined || event.longitude === undefined || event.latitude === null || event.longitude === null) {
      return;
    }
    const url = Platform.select({
      ios: `maps:0,0?q=${event.title}@${event.latitude},${event.longitude}`,
      android: `geo:0,0?q=${event.latitude},${event.longitude}(${event.title})`,
      default: `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`,
    });
    if (url) {
      void Linking.openURL(url);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Date unknown';
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error || 'Event not found.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={fetchEventDetails}
        >
          <Text style={[styles.retryBtnText, { color: colors.white }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCancelled = event.status === 'cancelled';
  const isFull = event.capacity && event.registrationsCount >= event.capacity;
  const hasCoordinates =
    event.latitude !== undefined &&
    event.longitude !== undefined &&
    event.latitude !== null &&
    event.longitude !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.white }]} numberOfLines={1}>
          Event Details
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TITLE & CATEGORY */}
        <View style={styles.titleSection}>
          <Text style={[styles.eventTitle, { color: colors.white }]}>{event.title}</Text>
          <Text
            style={[
              styles.categoryBadge,
              {
                color: colors.primary,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {event.category}
          </Text>
        </View>

        {/* STATUS BAR */}
        {isCancelled ? (
          <View style={[styles.statusBanner, { backgroundColor: '#FFD3D3', borderColor: colors.danger }]}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.statusBannerText, { color: colors.danger }]}>
              This event has been cancelled by the organizer.
            </Text>
          </View>
        ) : null}

        {/* DESCRIPTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.white }]}>Description</Text>
          <Text style={[styles.eventDesc, { color: colors.textSecondary }]}>
            {event.description || 'No description provided.'}
          </Text>
        </View>

        {/* INFO CARD */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.white }]}>Schedule & Info</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.white }]}>
                {formatDate(event.date)}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="time-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Time</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.white }]}>
                {event.startTime} {event.endTime ? ` - ${event.endTime}` : ''}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Venue</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.white }]}>
                {event.venue || 'N/A'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="people-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Seats Filled</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.white }]}>
                {event.capacity
                  ? `${event.registrationsCount} / ${event.capacity} registered`
                  : `${event.registrationsCount} registered`}
              </Text>
            </View>

            {event.capacity && (
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="ticket-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Seats Available</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.white }]}>
                  {Math.max(0, event.capacity - event.registrationsCount)} seats available
                </Text>
              </View>
            )}

            {event.organizerName ? (
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Organizer</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.white }]}>
                  {event.organizerName}
                </Text>
              </View>
            ) : null}

            {event.club?.name ? (
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Host Club</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const clubId = event.club?.id || event.club?._id;
                    if (!isValidObjectId(clubId)) {
                      Alert.alert('Error', 'Unable to open club details. Invalid identifier.');
                      return;
                    }
                    router.push({
                      pathname: '/(main)/club-details',
                      params: { id: clubId },
                    });
                  }}
                >
                  <Text style={[styles.infoValue, { color: colors.primary, textDecorationLine: 'underline' }]}>
                    {event.club.name}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* VENUE MAP BUTTON */}
        {hasCoordinates && (
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            onPress={openMap}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.mapBtnText, { color: colors.white }]}>View Venue Map (External)</Text>
          </TouchableOpacity>
        )}

        {/* REGISTRATION ACTION BUTTON */}
        {currentUser?.role !== 'admin' && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isCancelled
                    ? colors.surfaceSecondary
                    : isRegistered
                    ? colors.success
                    : isFull
                    ? colors.surfaceSecondary
                    : colors.primary,
                  borderColor: isCancelled || isFull ? colors.border : 'transparent',
                },
              ]}
              onPress={handleRegisterToggle}
              activeOpacity={0.8}
              disabled={registering || isCancelled || (isFull && !isRegistered)}
            >
              {registering ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={[styles.actionBtnText, { color: colors.white }]}>
                  {isCancelled
                    ? 'Event Cancelled'
                    : isRegistered
                    ? 'Registered'
                    : isFull
                    ? 'Event Full'
                    : 'Register'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, marginVertical: 12, textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryBtnText: { fontSize: 13, fontWeight: '600' },
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
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  titleSection: { marginBottom: 16 },
  eventTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  categoryBadge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  eventDesc: { fontSize: 14, lineHeight: 22 },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  mapBtnText: { fontSize: 14, fontWeight: '700' },
  actionContainer: { alignItems: 'center' },
  actionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
});
