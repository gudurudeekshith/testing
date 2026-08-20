import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  Linking,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { apiRequest } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';

const TABS = ['About', 'Events', 'Members'];

const isValidObjectId = (val: string | undefined | null): boolean => {
  if (!val) return false;
  return /^[0-9a-fA-F]{24}$/.test(val);
};

export default function ClubDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('About');

  // Sub-data states
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // User relations
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchClubDetails = useCallback(async () => {
    if (!isValidObjectId(id)) {
      setError('Invalid club ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<any>(`/clubs/${id}`);
      if (res.success) {
        setClub(res.data || null);
      } else {
        setError(res.message || 'Unable to load club details.');
      }
    } catch (e: any) {
      setError(e.message || 'Unable to load club details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkSavedStatus = useCallback(async () => {
    if (!isValidObjectId(id)) return;
    try {
      const res = await apiRequest<any>(`/clubs/${id}/saved`);
      if (res.success) {
        setIsSaved(!!res.saved);
      }
    } catch {
      setIsSaved(false);
    }
  }, [id]);

  const fetchClubEvents = useCallback(async () => {
    if (!isValidObjectId(id)) return;
    setEventsLoading(true);
    try {
      const res = await apiRequest<any>(`/clubs/${id}/events`);
      if (res.success) {
        setEvents(res.data || []);
      }
    } catch (e) {
      console.error('Fetch club events error:', e);
    } finally {
      setEventsLoading(false);
    }
  }, [id]);

  const fetchClubMembers = useCallback(async () => {
    if (!isValidObjectId(id)) return;
    setMembersLoading(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const res = await apiRequest<any>(`/clubs/${id}/members`);
      if (res.success) {
        const membersList = res.data || [];
        setMembers(membersList);
        if (user?.id) {
          setIsMember(membersList.some((m: any) => m.userId === user.id));
        }
      }
    } catch (e) {
      console.error('Fetch club members error:', e);
    } finally {
      setMembersLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!isValidObjectId(id)) {
        setError('Invalid club ID');
        setLoading(false);
        return;
      }
      void fetchClubDetails();
      void checkSavedStatus();
      void fetchClubEvents();
      void fetchClubMembers();
    }, [id, fetchClubDetails, checkSavedStatus, fetchClubEvents, fetchClubMembers])
  );

  const toggleSaveClub = async () => {
    if (saving || !id) return;
    setSaving(true);
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const res = await apiRequest<any>(`/clubs/${id}/save`, { method });
      if (res.success) {
        setIsSaved(!isSaved);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to update saved status.');
    } finally {
      setSaving(false);
    }
  };

  const handleJoinToggle = async () => {
    if (joining || !id) return;
    setJoining(true);
    try {
      if (isMember) {
        // Leave club confirmation
        Alert.alert('Leave Club', 'Are you sure you want to leave this club?', [
          { text: 'Cancel', style: 'cancel', onPress: () => setJoining(false) },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                const res = await apiRequest<any>(`/clubs/${id}/leave`, { method: 'DELETE' });
                if (res.success) {
                  setIsMember(false);
                  void fetchClubDetails();
                  void fetchClubMembers();
                }
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Unable to leave club.');
              } finally {
                setJoining(false);
              }
            },
          },
        ]);
      } else {
        const res = await apiRequest<any>(`/clubs/${id}/join`, { method: 'POST' });
        if (res.success) {
          setIsMember(true);
          void fetchClubDetails();
          void fetchClubMembers();
          Alert.alert('Welcome!', 'You have successfully joined the club.');
          setJoining(false);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to complete action.');
      setJoining(false);
    }
  };

  const handleEmailPress = async (email: string) => {
    if (!email) return;
    const url = `mailto:${email.trim()}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Mail App', 'No email client installed on this device.');
      }
    } catch {
      Alert.alert('Mail App', 'Unable to open email client.');
    }
  };

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

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !club) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error || 'Club not found.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={fetchClubDetails}
        >
          <Text style={[styles.retryBtnText, { color: colors.white }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.white }]} numberOfLines={1}>
          Club Details
        </Text>

        <TouchableOpacity onPress={toggleSaveClub} style={styles.headerBtn}>
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={24}
            color={isSaved ? colors.danger : colors.white}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            {club.logo ? (
              <Image source={{ uri: club.logo }} style={styles.logoImage} />
            ) : (
              <Ionicons name="people-outline" size={44} color={colors.primary} />
            )}
          </View>

          <Text style={[styles.clubName, { color: colors.white }]}>{club.name}</Text>
          <Text style={[styles.clubCategory, { color: colors.textSecondary }]}>{club.category}</Text>
        </View>

        {/* JOIN CLUB BUTTON */}
        {currentUser?.role !== 'admin' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isMember ? colors.surfaceSecondary : colors.primary,
                  borderColor: isMember ? colors.border : colors.primary,
                },
              ]}
              onPress={handleJoinToggle}
              activeOpacity={0.8}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={[styles.actionBtnText, { color: colors.white }]}>
                  {isMember ? 'Leave Club' : 'Join Club'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* TABS SELECTOR */}
        <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t ? { borderBottomColor: colors.primary } : null]}
              onPress={() => setActiveTab(t)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === t ? colors.primary : colors.textSecondary,
                    fontWeight: activeTab === t ? '700' : '500',
                  },
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TAB CONTENTS */}
        {activeTab === 'About' && (
          <View style={styles.aboutContainer}>
            <Text style={[styles.sectionTitle, { color: colors.white }]}>About the Club</Text>
            <Text style={[styles.clubDesc, { color: colors.textSecondary }]}>
              {club.description || 'No description available for this club.'}
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.white, marginTop: 12 }]}>Club Information</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Established Year</Text>
                <Text style={[styles.infoValue, { color: colors.white }]}>
                  {club.establishedYear || 'N/A'}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Club Head</Text>
                <Text style={[styles.infoValue, { color: colors.white }]}>
                  {club.clubHead || 'N/A'}
                </Text>
              </View>

              {club.contactEmail ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Contact Email</Text>
                  <TouchableOpacity onPress={() => handleEmailPress(club.contactEmail)}>
                    <Text style={[styles.infoValue, { color: colors.primary, textDecorationLine: 'underline' }]}>
                      {club.contactEmail}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {club.contactPhone ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Phone Number</Text>
                  <Text style={[styles.infoValue, { color: colors.white }]}>
                    {club.contactPhone}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {activeTab === 'Events' && (
          <View style={styles.eventsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.white }]}>Hosted Events</Text>
            {eventsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : events.length === 0 ? (
              <View style={styles.emptyTabState}>
                <Text style={[styles.emptyTabText, { color: colors.textSecondary }]}>
                  No events currently scheduled.
                </Text>
              </View>
            ) : (
              events.map((item) => (
                <TouchableOpacity
                  key={item.id || item._id}
                  style={[styles.eventItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/event-details',
                      params: { id: item.id || item._id },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.eventItemHeader}>
                    <Text style={[styles.eventItemTitle, { color: colors.white }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.eventItemDate, { color: colors.primary }]}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                  <Text style={[styles.eventItemVenue, { color: colors.textSecondary }]} numberOfLines={1}>
                    Venue: {item.venue}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'Members' && (
          <View style={styles.membersContainer}>
            <Text style={[styles.sectionTitle, { color: colors.white }]}>Club Roster</Text>
            {membersLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : members.length === 0 ? (
              <View style={styles.emptyTabState}>
                <Text style={[styles.emptyTabText, { color: colors.textSecondary }]}>
                  No active members.
                </Text>
              </View>
            ) : (
              members.map((item) => (
                <View
                  key={item.membershipId}
                  style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {(item.name || 'M').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.white }]}>{item.name}</Text>
                    <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                      {item.role || 'Member'}
                    </Text>
                  </View>
                </View>
              ))
            )}
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
  scrollContent: { padding: 16 },
  heroSection: { alignItems: 'center', marginTop: 12, marginBottom: 20 },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoImage: { width: '100%', height: '100%', borderRadius: 19 },
  clubName: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  clubCategory: { fontSize: 13, fontWeight: '500' },
  actionRow: { alignItems: 'center', marginBottom: 24 },
  actionBtn: {
    width: '80%',
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  tabsRow: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, paddingBottom: 6 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14 },
  aboutContainer: {},
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  clubDesc: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  eventsContainer: {},
  emptyTabState: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTabText: { fontSize: 13 },
  eventItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  eventItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  eventItemTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  eventItemDate: { fontSize: 12, fontWeight: '600' },
  eventItemVenue: { fontSize: 12 },
  membersContainer: {},
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '700' },
  memberRole: { fontSize: 12, marginTop: 2 },
});
