import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { apiRequest, apiUploadImage } from '../../services/api';
import { getCurrentUser, getAuthToken } from '../../utils/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const DATE_CHIPS = ['Upcoming', 'Today', 'This Week', 'This Month', 'Past'];
const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Seminar', 'Other'];
const CLUB_CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Other'];

const isValidObjectId = (val: string | undefined | null): boolean => {
  if (!val) return false;
  return /^[0-9a-fA-F]{24}$/.test(val);
};

// Helper functions for Date and Time Pickers
const formatTime12h = (date: Date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};

const formatDateReadable = (date: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatDateISO = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseTimeString = (timeStr: string, baseDate: Date = new Date()): Date => {
  const time = new Date(baseDate);
  if (!timeStr) return time;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3];
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    time.setHours(hours, minutes, 0, 0);
  }
  return time;
};

export default function EventsClubsScreen() {
  const { colors } = useTheme();

  // Authentication states
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authRole, setAuthRole] = useState<'student' | 'admin' | null>(null);

  // Student active tab segment: 'Dashboard' | 'Events' | 'Clubs'
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Events' | 'Clubs'>('Dashboard');

  // List data states
  const [events, setEvents] = useState<any[]>([]);
  const [clubsRaw, setClubsRaw] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [joinedClubs, setJoinedClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student Dashboard stats
  const [joinedClubsCount, setJoinedClubsCount] = useState(0);
  const [myRegistrationsCount, setMyRegistrationsCount] = useState(0);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);

  // Admin stats
  const [adminStats, setAdminStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    totalClubs: 0,
    totalEventRegistrations: 0,
    totalClubMembers: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDateChip, setSelectedDateChip] = useState('Upcoming');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Admin control states
  const [adminTab, setAdminTab] = useState<'Clubs' | 'Events'>('Clubs');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'club' | 'event'>('club');
  const [editId, setEditId] = useState<string | null>(null);

  // Admin Form fields - Club
  const [clubName, setClubName] = useState('');
  const [clubCategoryForm, setClubCategoryForm] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [clubLogo, setClubLogo] = useState('');
  const [clubEmail, setClubEmail] = useState('');
  const [clubPhone, setClubPhone] = useState('');
  const [clubYear, setClubYear] = useState('');
  const [clubCapacity, setClubCapacity] = useState('');

  // Admin Form fields - Event
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategoryForm, setEventCategoryForm] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventCapacity, setEventCapacity] = useState('');
  const [eventLat, setEventLat] = useState('');
  const [eventLng, setEventLng] = useState('');
  const [eventClubId, setEventClubId] = useState('');
  const [eventImage, setEventImage] = useState('');

  const [clubUploadMode, setClubUploadMode] = useState<'upload' | 'url'>('url');
  const [eventUploadMode, setEventUploadMode] = useState<'upload' | 'url'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);

  const pickAndUploadImage = async (onSuccess: (url: string) => void) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow gallery access to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      
      const fileSizeLimit = 5 * 1024 * 1024; // 5MB
      if (asset.fileSize && asset.fileSize > fileSizeLimit) {
        Alert.alert('File Too Large', 'Selected image exceeds the 5MB size limit.');
        return;
      }

      const filename = asset.uri.split('/').pop()?.toLowerCase() || '';
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
      const hasValidExt = allowedExts.some(ext => filename.endsWith(ext));
      if (!hasValidExt && asset.mimeType) {
        const mime = asset.mimeType.toLowerCase();
        const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMime.includes(mime)) {
          Alert.alert('Invalid Format', 'Only JPG, JPEG, PNG, and WEBP formats are allowed.');
          return;
        }
      }

      setUploadingImage(true);
      const uploadedUrl = await apiUploadImage(asset.uri);
      onSuccess(uploadedUrl);
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (err: any) {
      console.error('Image upload error:', err);
      Alert.alert('Upload Failed', err.message || 'An error occurred during upload.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Native Picker value states
  const [eventDatePickerValue, setEventDatePickerValue] = useState(new Date());
  const [eventStartPickerValue, setEventStartPickerValue] = useState(new Date());
  const [eventEndPickerValue, setEventEndPickerValue] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Form literal string displays
  const [eventDate, setEventDate] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');

  // Roster view states
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterType, setRosterType] = useState<'event' | 'club'>('event');
  const [rosterTargetId, setRosterTargetId] = useState('');
  const [rosterTargetName, setRosterTargetName] = useState('');
  const [rosterData, setRosterData] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Check user session
  const checkAppSession = async () => {
    try {
      const user = await getCurrentUser();
      const token = await getAuthToken();
      if (token && user) {
        setAuthRole(user.role as any);
      } else {
        router.replace('/(auth)/login');
      }
    } catch (err) {
      console.error('Session verification error:', err);
      router.replace('/(auth)/login');
    } finally {
      setCheckingAuth(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void checkAppSession();
    }, [])
  );

  const loadDashboardData = useCallback(async () => {
    if (checkingAuth || !authRole) return;
    setLoading(true);
    setError(null);
    try {
      if (authRole === 'admin') {
        const [statsRes, clubsRes, eventsRes] = await Promise.all([
          apiRequest<any>('/admin/events-clubs/stats'),
          apiRequest<any>('/clubs'),
          apiRequest<any>('/events?date=all'),
        ]);
        if (statsRes.success) setAdminStats(statsRes.stats);
        if (clubsRes.success) setClubsRaw(clubsRes.data || []);
        if (eventsRes.success) setEvents(eventsRes.data || []);
      } else {
        // Student role
        if (activeTab === 'Dashboard') {
          const [clubsRes, joinedRes, regsRes, eventsRes] = await Promise.all([
            apiRequest<any>('/clubs'),
            apiRequest<any>('/clubs/joined'),
            apiRequest<any>('/registrations/me'),
            apiRequest<any>('/events?date=upcoming'),
          ]);
          if (clubsRes.success) setClubsRaw(clubsRes.data || []);
          if (joinedRes.success) {
            setJoinedClubs(joinedRes.data || []);
            setJoinedClubsCount(joinedRes.data?.length || 0);
          }
          if (regsRes.success) {
            const list = regsRes.data || [];
            setMyRegistrationsCount(list.filter((r: any) => r.status === 'registered').length);
          }
          if (eventsRes.success) {
            setEvents(eventsRes.data || []);
            setUpcomingEventsCount(eventsRes.data?.length || 0);
          }
        } else if (activeTab === 'Events') {
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
        } else {
          // Clubs tab
          const [clubsRes, joinedRes] = await Promise.all([
            apiRequest<any>('/clubs'),
            apiRequest<any>('/clubs/joined'),
          ]);
          if (clubsRes.success) setClubsRaw(clubsRes.data || []);
          if (joinedRes.success) setJoinedClubs(joinedRes.data || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }, [checkingAuth, authRole, activeTab, selectedDateChip, selectedCategory, search]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardData();
    }, [loadDashboardData])
  );

  // Client-side clubs filtering for student Clubs tab
  useEffect(() => {
    if (authRole === 'student' && activeTab === 'Clubs') {
      const q = search.trim().toLowerCase();
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
    }
  }, [search, selectedCategory, clubsRaw, activeTab, authRole]);

  // Check if student joined a club
  const isClubJoined = (clubId: string) => {
    return joinedClubs.some((c) => (c.id || c._id) === clubId);
  };

  const handleJoinClubFromCard = async (club: any) => {
    const clubId = club.id || club._id;
    if (!isValidObjectId(clubId)) {
      Alert.alert('Error', 'Unable to join club. Invalid identifier.');
      return;
    }
    const joined = isClubJoined(clubId);
    try {
      if (joined) {
        const res = await apiRequest<any>(`/clubs/${clubId}/leave`, { method: 'DELETE' });
        if (res.success) {
          setJoinedClubs((prev) => prev.filter((c) => (c.id || c._id) !== clubId));
          setJoinedClubsCount((prev) => Math.max(0, prev - 1));
          setClubsRaw((prev) => prev.map((c) => (c.id || c._id) === clubId ? { ...c, membersCount: Math.max(0, (c.membersCount || 0) - 1) } : c));
          Alert.alert('Left Club', `You have successfully left ${club.name}.`);
        }
      } else {
        const isFull = club.capacity && (club.membersCount || 0) >= club.capacity;
        if (isFull) {
          Alert.alert('Club Full', 'This club is full. No slots available.');
          return;
        }
        const res = await apiRequest<any>(`/clubs/${clubId}/join`, { method: 'POST' });
        if (res.success) {
          setJoinedClubs((prev) => [...prev, club]);
          setJoinedClubsCount((prev) => prev + 1);
          setClubsRaw((prev) => prev.map((c) => (c.id || c._id) === clubId ? { ...c, membersCount: (c.membersCount || 0) + 1 } : c));
          Alert.alert('Welcome!', `You have successfully joined ${club.name}.`);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to update membership.');
    }
  };

  // Admin form management
  const resetClubForm = () => {
    setClubName('');
    setClubCategoryForm('');
    setClubDesc('');
    setClubLogo('');
    setClubEmail('');
    setClubPhone('');
    setClubYear('');
    setClubCapacity('');
    setClubUploadMode('url');
    setEditId(null);
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventCategoryForm('');
    setEventDesc('');
    setEventDate('');
    setEventStart('');
    setEventEnd('');
    setEventVenue('');
    setEventCapacity('');
    setEventLat('');
    setEventLng('');
    setEventClubId('');
    setEventImage('');
    setEventDatePickerValue(new Date());
    setEventStartPickerValue(new Date());
    setEventEndPickerValue(new Date(new Date().getTime() + 60 * 60 * 1000));
    setEventUploadMode('url');
    setEditId(null);
  };

  const openClubCreate = () => {
    resetClubForm();
    setFormType('club');
    setIsFormOpen(true);
  };

  const openEventCreate = () => {
    resetEventForm();
    setFormType('event');
    setIsFormOpen(true);
  };

  const openClubEdit = (club: any) => {
    setFormType('club');
    setEditId(club.id || club._id);
    setClubName(club.name || '');
    setClubCategoryForm(club.category || '');
    setClubDesc(club.description || '');
    setClubLogo(club.logo || '');
    setClubEmail(club.contactEmail || '');
    setClubPhone(club.contactPhone || '');
    setClubYear(club.establishedYear ? club.establishedYear.toString() : '');
    setClubCapacity(club.capacity ? club.capacity.toString() : '');
    setClubUploadMode('url');
    setIsFormOpen(true);
  };

  const openEventEdit = (event: any) => {
    setFormType('event');
    setEditId(event.id || event._id);
    setEventTitle(event.title || '');
    setEventCategoryForm(event.category || '');
    setEventDesc(event.description || '');
    setEventVenue(event.venue || '');
    setEventCapacity(event.capacity ? event.capacity.toString() : '');
    setEventLat(event.latitude ? event.latitude.toString() : '');
    setEventLng(event.longitude ? event.longitude.toString() : '');
    setEventClubId(event.club?.id || event.club?._id || '');
    setEventImage(event.image || '');

    const baseD = event.date ? new Date(event.date) : new Date();
    setEventDatePickerValue(baseD);
    setEventDate(formatDateISO(baseD));

    const startD = parseTimeString(event.startTime, baseD);
    setEventStartPickerValue(startD);
    setEventStart(formatTime12h(startD));

    const endD = event.endTime ? parseTimeString(event.endTime, baseD) : new Date(startD.getTime() + 60 * 60 * 1000);
    setEventEndPickerValue(endD);
    setEventEnd(formatTime12h(endD));

    setEventUploadMode('url');
    setIsFormOpen(true);
  };

  const handleClubSubmit = async () => {
    if (!clubName.trim() || !clubCategoryForm.trim() || !clubDesc.trim()) {
      Alert.alert('Required Info', 'Name, Category and Description are required.');
      return;
    }

    try {
      const payload = {
        name: clubName.trim(),
        category: clubCategoryForm.trim(),
        description: clubDesc.trim(),
        logo: clubLogo.trim() || undefined,
        contactEmail: clubEmail.trim() || undefined,
        contactPhone: clubPhone.trim() || undefined,
        establishedYear: clubYear.trim() ? parseInt(clubYear) : undefined,
        capacity: clubCapacity.trim() ? parseInt(clubCapacity) : undefined,
      };

      let res;
      if (editId) {
        res = await apiRequest<any>(`/clubs/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest<any>('/clubs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        Alert.alert('Success', editId ? 'Club updated successfully.' : 'Club created successfully.');
        setIsFormOpen(false);
        void loadDashboardData();
      } else {
        Alert.alert('Failed', res.message || 'Operation failed.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred.');
    }
  };

  const handleEventSubmit = async () => {
    if (!eventTitle.trim() || !eventCategoryForm.trim() || !eventDesc.trim() || !eventDate.trim() || !eventStart.trim() || !eventVenue.trim()) {
      Alert.alert('Required Info', 'Title, Category, Desc, Date, Start Time, and Venue are required.');
      return;
    }

    // Time validation: end time must be after start time on the same day
    const startHours = eventStartPickerValue.getHours();
    const startMins = eventStartPickerValue.getMinutes();
    const endHours = eventEndPickerValue.getHours();
    const endMins = eventEndPickerValue.getMinutes();

    if (endHours < startHours || (endHours === startHours && endMins <= startMins)) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }

    try {
      const payload = {
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        category: eventCategoryForm.trim(),
        date: eventDate.trim(),
        startTime: eventStart.trim(),
        endTime: eventEnd.trim() || undefined,
        venue: eventVenue.trim(),
        capacity: eventCapacity.trim() ? parseInt(eventCapacity) : undefined,
        latitude: eventLat.trim() ? parseFloat(eventLat) : undefined,
        longitude: eventLng.trim() ? parseFloat(eventLng) : undefined,
        club: eventClubId.trim() || undefined,
      };

      let res;
      if (editId) {
        res = await apiRequest<any>(`/events/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest<any>('/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        Alert.alert('Success', editId ? 'Event updated successfully.' : 'Event created successfully.');
        setIsFormOpen(false);
        void loadDashboardData();
      } else {
        Alert.alert('Failed', res.message || 'Operation failed.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred.');
    }
  };

  const handleClubDelete = (id: string) => {
    Alert.alert('Delete Club', 'Are you sure you want to delete this club? This action is permanent.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest<any>(`/clubs/${id}`, { method: 'DELETE' });
            if (res.success) {
              Alert.alert('Success', 'Club deleted.');
              void loadDashboardData();
            }
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete club.');
          }
        },
      },
    ]);
  };

  const handleEventCancel = (id: string) => {
    Alert.alert('Cancel Event', 'Are you sure you want to cancel this event? A notification will be sent to all registrants.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Event',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest<any>(`/events/${id}/cancel`, { method: 'PATCH' });
            if (res.success) {
              Alert.alert('Success', 'Event marked as cancelled.');
              void loadDashboardData();
            }
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to cancel event.');
          }
        },
      },
    ]);
  };

  const handleEventDelete = (id: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event? This action is permanent.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest<any>(`/events/${id}`, { method: 'DELETE' });
            if (res.success) {
              Alert.alert('Success', 'Event deleted.');
              void loadDashboardData();
            }
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete event.');
          }
        },
      },
    ]);
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

  const openRoster = async (type: 'event' | 'club', id: string, name: string) => {
    if (!isValidObjectId(id)) {
      Alert.alert('Error', `Unable to open roster. Invalid ${type} identifier.`);
      return;
    }
    setRosterType(type);
    setRosterTargetId(id);
    setRosterTargetName(name);
    setRosterData([]);
    setShowRosterModal(true);
    setRosterLoading(true);
    try {
      const endpoint = type === 'event' ? `/events/${id}/registrations` : `/clubs/${id}/members`;
      const res = await apiRequest<any>(endpoint);
      if (res.success) {
        setRosterData(res.data || []);
      } else {
        Alert.alert('Error', res.message || 'Unable to load list.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to load list.');
    } finally {
      setRosterLoading(false);
    }
  };

  // Rendering student cards
  const renderStudentEvent = ({ item }: { item: any }) => {
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
        onPress={() => {
          const eventId = item.id || item._id;
          if (!eventId || eventId === 'undefined' || eventId === 'null') {
            console.error('Invalid event details click. Event:', item);
            Alert.alert('Error', 'Unable to open event details. Invalid identifier.');
            return;
          }
          router.push({
            pathname: '/(main)/event-details',
            params: { id: eventId },
          });
        }}
        activeOpacity={0.8}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        ) : null}

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
                ? `${item.registrationsCount} / ${item.capacity} registered`
                : `${item.registrationsCount} registered`}
            </Text>
          </View>
        </View>

        {item.capacity && (
          <View style={[styles.cardMetaRow, { marginBottom: 4 }]}>
            <View style={styles.metaItem}>
              <Ionicons name="ticket-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {Math.max(0, item.capacity - item.registrationsCount)} seats available
              </Text>
            </View>
          </View>
        )}

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

  const renderStudentClub = ({ item }: { item: any }) => {
    const joined = isClubJoined(item.id || item._id);
    const isFull = item.capacity && (item.membersCount || 0) >= item.capacity;
    const availableSlots = item.capacity ? Math.max(0, item.capacity - (item.membersCount || 0)) : null;

    return (
      <View
        style={[
          styles.clubCard,
          {
            flexDirection: 'column',
            alignItems: 'stretch',
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: 14,
            marginBottom: 12,
            borderRadius: 16,
            borderWidth: 1,
          },
        ]}
      >
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => {
            const clubId = item.id || item._id;
            if (!isValidObjectId(clubId)) {
              console.error('Invalid club details click. Club:', item);
              Alert.alert('Error', 'Unable to open club details. Invalid identifier.');
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
                width: 44,
                height: 44,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                marginRight: 12,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            {item.logo ? (
              <Image source={{ uri: item.logo }} style={styles.clubLogoImage} />
            ) : (
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.clubInfo}>
            <Text style={[styles.clubNameText, { color: colors.white }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.clubCategory, { color: colors.textSecondary, fontSize: 11, marginTop: 2 }]}>
              {item.category}
            </Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={[styles.clubMembersRow, { marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                {item.capacity ? `${item.membersCount || 0} / ${item.capacity}` : `${item.membersCount || 0}`} Members
              </Text>
            </View>
            {availableSlots !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="card-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {availableSlots} slots
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: joined ? colors.surfaceSecondary : isFull ? colors.surfaceSecondary : colors.primary,
              borderColor: joined || isFull ? colors.border : 'transparent',
              borderWidth: 1,
              borderRadius: 8,
              paddingVertical: 5,
              paddingHorizontal: 12,
            }}
            onPress={() => handleJoinClubFromCard(item)}
            disabled={isFull && !joined}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.white }}>
              {joined ? 'Joined' : isFull ? 'Club Full' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAdminClubItem = ({ item }: { item: any }) => {
    const availableSlots = item.capacity ? Math.max(0, item.capacity - (item.membersCount || 0)) : null;
    return (
      <View style={[styles.adminItemCard, { flexDirection: 'column', alignItems: 'stretch', backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={[styles.clubLogoPlaceholder, { width: 36, height: 36, marginRight: 10, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            {item.logo ? (
              <Image source={{ uri: item.logo }} style={styles.clubLogoImage} />
            ) : (
              <Ionicons name="people-outline" size={18} color={colors.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, { color: colors.white }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{item.category}</Text>
          </View>
        </View>

        <View style={[styles.cardMetaRow, { marginBottom: 6 }]}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              Members: {item.membersCount || 0} / {item.capacity || 100}
            </Text>
          </View>
          {availableSlots !== null && (
            <View style={styles.metaItem}>
              <Ionicons name="card-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Available Slots: {availableSlots}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 10 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 }}
            onPress={() => openRoster('club', item.id || item._id, item.name)}
          >
            <Ionicons name="people" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.white }}>View Members</Text>
          </TouchableOpacity>

          <View style={styles.itemActionRow}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => openClubEdit(item)}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleClubDelete(item.id || item._id)}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderAdminEventItem = ({ item }: { item: any }) => {
    const isCancelled = item.status === 'cancelled';
    const remainingSeats = item.capacity ? Math.max(0, item.capacity - item.registrationsCount) : null;
    return (
      <View style={[styles.adminItemCard, { flexDirection: 'column', alignItems: 'stretch', backgroundColor: colors.surface, borderColor: colors.border, opacity: isCancelled ? 0.6 : 1 }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        ) : null}
        <View style={styles.cardHeader}>
          <Text style={[styles.eventTitle, { color: colors.white }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.eventCategory, { color: colors.primary, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            {item.category}
          </Text>
        </View>
        <Text style={[styles.eventDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>

        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.startTime} {item.endTime ? `- ${item.endTime}` : ''}</Text>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.venue}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.capacity ? `${item.registrationsCount} / ${item.capacity} booked` : `${item.registrationsCount} booked`}
            </Text>
          </View>
        </View>

        {remainingSeats !== null && (
          <View style={[styles.cardMetaRow, { marginBottom: 6 }]}>
            <View style={styles.metaItem}>
              <Ionicons name="ticket-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{remainingSeats} seats available</Text>
            </View>
            {item.club?.name && (
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Club: {item.club.name}</Text>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 10 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 }}
            onPress={() => openRoster('event', item.id || item._id, item.title)}
          >
            <Ionicons name="people" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.white }}>View Registrations</Text>
          </TouchableOpacity>

          <View style={styles.itemActionRow}>
            {!isCancelled && (
              <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleEventCancel(item.id || item._id)}>
                <Ionicons name="close-circle-outline" size={20} color="#FF8A00" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => openEventEdit(item)}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleEventDelete(item.id || item._id)}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // 1. ADMIN DASHBOARD VIEW
  if (authRole === 'admin') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* ADMIN HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.white }]}>Admin Panel</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* TABS */}
        {!isFormOpen && (
          <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.tab, adminTab === 'Clubs' ? { borderBottomColor: colors.primary } : null]}
              onPress={() => setAdminTab('Clubs')}
            >
              <Text style={[styles.tabText, { color: adminTab === 'Clubs' ? colors.primary : colors.textSecondary, fontWeight: adminTab === 'Clubs' ? '700' : '500' }]}>
                Manage Clubs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, adminTab === 'Events' ? { borderBottomColor: colors.primary } : null]}
              onPress={() => setAdminTab('Events')}
            >
              <Text style={[styles.tabText, { color: adminTab === 'Events' ? colors.primary : colors.textSecondary, fontWeight: adminTab === 'Events' ? '700' : '500' }]}>
                Manage Events
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INLINE ADMIN FORM */}
        {isFormOpen ? (
          <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.formHeaderRow}>
              <Text style={[styles.formTitle, { color: colors.white }]}>
                {editId ? `Edit ${formType === 'club' ? 'Club' : 'Event'}` : `New ${formType === 'club' ? 'Club' : 'Event'}`}
              </Text>
              <TouchableOpacity onPress={() => setIsFormOpen(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {formType === 'club' ? (
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Club Name *</Text>
                <TextInput value={clubName} onChangeText={setClubName} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="eg. Programming Club" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
                <TextInput value={clubCategoryForm} onChangeText={setClubCategoryForm} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="eg. Technical" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
                <TextInput value={clubDesc} onChangeText={setClubDesc} style={[styles.input, styles.textArea, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} multiline numberOfLines={4} placeholder="About the club..." placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Maximum Members *</Text>
                <TextInput value={clubCapacity} onChangeText={setClubCapacity} keyboardType="numeric" style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="100" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Club Logo</Text>
                
                {/* Image Preview Panel */}
                <View style={[styles.previewContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  {clubLogo ? (
                    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <Image source={{ uri: clubLogo }} style={styles.previewImage} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.removeImageBadge}
                        onPress={() => setClubLogo('')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={16} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <Ionicons name="image-outline" size={40} color={colors.textMuted} style={{ marginBottom: 4 }} />
                      <Text style={[styles.placeholderText, { color: colors.textMuted }]}>No Logo Selected</Text>
                    </View>
                  )}
                </View>

                {/* Selector Mode Buttons */}
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      clubUploadMode === 'upload' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setClubUploadMode('upload')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeBtnText, { color: clubUploadMode === 'upload' ? colors.white : colors.textSecondary }]}>Upload Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      clubUploadMode === 'url' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setClubUploadMode('url')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeBtnText, { color: clubUploadMode === 'url' ? colors.white : colors.textSecondary }]}>Use Image URL</Text>
                  </TouchableOpacity>
                </View>

                {/* Conditional Picker/Inputs */}
                {clubUploadMode === 'upload' ? (
                  <TouchableOpacity
                    style={[styles.uploadActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, marginBottom: 12 }]}
                    onPress={() => pickAndUploadImage(setClubLogo)}
                    disabled={uploadingImage}
                    activeOpacity={0.8}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.uploadActionBtnText, { color: colors.white }]}>Choose from Gallery</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    value={clubLogo}
                    onChangeText={setClubLogo}
                    style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}
                    placeholder="Paste Logo URL here (eg. https://example.com/logo.jpg)"
                    placeholderTextColor={colors.textMuted}
                  />
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>Contact Email</Text>
                <TextInput value={clubEmail} onChangeText={setClubEmail} keyboardType="email-address" style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="club@kitsw.ac.in" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Contact Phone</Text>
                <TextInput value={clubPhone} onChangeText={setClubPhone} keyboardType="phone-pad" style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="9999999999" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Established Year</Text>
                <TextInput value={clubYear} onChangeText={setClubYear} keyboardType="numeric" style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="2020" placeholderTextColor={colors.textMuted} />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }, uploadingImage && { opacity: 0.6 }]}
                  onPress={handleClubSubmit}
                  disabled={uploadingImage}
                >
                  <Text style={[styles.submitBtnText, { color: colors.white }]}>
                    {uploadingImage ? 'Uploading image...' : 'Save Club'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Event Title *</Text>
                <TextInput value={eventTitle} onChangeText={setEventTitle} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="eg. Coding Contest" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
                <TextInput value={eventCategoryForm} onChangeText={setEventCategoryForm} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="eg. Technical" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
                <TextInput value={eventDesc} onChangeText={setEventDesc} style={[styles.input, styles.textArea, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} multiline numberOfLines={4} placeholder="Event description..." placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Event Date *</Text>
                <TouchableOpacity
                  style={[styles.input, { justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: eventDate ? colors.white : colors.textMuted }}>
                    {eventDate ? formatDateReadable(eventDatePickerValue) : 'Select Date'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.label, { color: colors.textSecondary }]}>Start Time *</Text>
                <TouchableOpacity
                  style={[styles.input, { justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={{ color: eventStart ? colors.white : colors.textMuted }}>
                    {eventStart || 'Select Start Time'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.label, { color: colors.textSecondary }]}>End Time *</Text>
                <TouchableOpacity
                  style={[styles.input, { justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={{ color: eventEnd ? colors.white : colors.textMuted }}>
                    {eventEnd || 'Select End Time'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.label, { color: colors.textSecondary }]}>Venue *</Text>
                <TextInput value={eventVenue} onChangeText={setEventVenue} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="CSE Seminar Hall" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Seat Capacity</Text>
                <TextInput value={eventCapacity} onChangeText={setEventCapacity} keyboardType="numeric" style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="100" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Venue Latitude</Text>
                <TextInput value={eventLat} onChangeText={setEventLat} keyboardType="numeric" style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="18.0125" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Venue Longitude</Text>
                <TextInput value={eventLng} onChangeText={setEventLng} keyboardType="numeric" style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="79.5601" placeholderTextColor={colors.textMuted} />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Event Image</Text>
                
                {/* Image Preview Panel */}
                <View style={[styles.previewContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  {eventImage ? (
                    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <Image source={{ uri: eventImage }} style={styles.previewImage} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.removeImageBadge}
                        onPress={() => setEventImage('')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={16} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <Ionicons name="image-outline" size={40} color={colors.textMuted} style={{ marginBottom: 4 }} />
                      <Text style={[styles.placeholderText, { color: colors.textMuted }]}>No Image Selected</Text>
                    </View>
                  )}
                </View>

                {/* Selector Mode Buttons */}
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      eventUploadMode === 'upload' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setEventUploadMode('upload')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeBtnText, { color: eventUploadMode === 'upload' ? colors.white : colors.textSecondary }]}>Upload Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      eventUploadMode === 'url' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setEventUploadMode('url')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeBtnText, { color: eventUploadMode === 'url' ? colors.white : colors.textSecondary }]}>Use Image URL</Text>
                  </TouchableOpacity>
                </View>

                {/* Conditional Picker/Inputs */}
                {eventUploadMode === 'upload' ? (
                  <TouchableOpacity
                    style={[styles.uploadActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, marginBottom: 12 }]}
                    onPress={() => pickAndUploadImage(setEventImage)}
                    disabled={uploadingImage}
                    activeOpacity={0.8}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.uploadActionBtnText, { color: colors.white }]}>Choose from Gallery</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    value={eventImage}
                    onChangeText={setEventImage}
                    style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}
                    placeholder="Paste Image URL here (eg. https://example.com/banner.jpg)"
                    placeholderTextColor={colors.textMuted}
                  />
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>Host Club ID (Optional)</Text>
                <TextInput value={eventClubId} onChangeText={setEventClubId} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="Paste Club ID here" placeholderTextColor={colors.textMuted} />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }, uploadingImage && { opacity: 0.6 }]}
                  onPress={handleEventSubmit}
                  disabled={uploadingImage}
                >
                  <Text style={[styles.submitBtnText, { color: colors.white }]}>
                    {uploadingImage ? 'Uploading image...' : 'Save Event'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Conditionally rendered Native Date/Time Pickers */}
            {showDatePicker && (
              <DateTimePicker
                value={eventDatePickerValue}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setEventDatePickerValue(date);
                    setEventDate(formatDateISO(date));
                  }
                }}
              />
            )}

            {showStartPicker && (
              <DateTimePicker
                value={eventStartPickerValue}
                mode="time"
                display="default"
                is24Hour={false}
                onChange={(e, time) => {
                  setShowStartPicker(false);
                  if (time) {
                    setEventStartPickerValue(time);
                    setEventStart(formatTime12h(time));
                  }
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={eventEndPickerValue}
                mode="time"
                display="default"
                is24Hour={false}
                onChange={(e, time) => {
                  setShowEndPicker(false);
                  if (time) {
                    setEventEndPickerValue(time);
                    setEventEnd(formatTime12h(time));
                  }
                }}
              />
            )}
          </ScrollView>
        ) : (
          /* ADMIN MANAGE LISTS AND STATS */
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* STATS OVERVIEW CARDS */}
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white, marginBottom: 10 }}>Overview Stats</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={[styles.adminStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.adminStatValue, { color: colors.white }]}>{adminStats.totalEvents}</Text>
                  <Text style={[styles.adminStatLabel, { color: colors.textSecondary }]}>Total Events</Text>
                </View>
                <View style={[styles.adminStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.adminStatValue, { color: colors.white }]}>{adminStats.upcomingEvents}</Text>
                  <Text style={[styles.adminStatLabel, { color: colors.textSecondary }]}>Upcoming</Text>
                </View>
                <View style={[styles.adminStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.adminStatValue, { color: colors.white }]}>{adminStats.totalClubs}</Text>
                  <Text style={[styles.adminStatLabel, { color: colors.textSecondary }]}>Total Clubs</Text>
                </View>
                <View style={[styles.adminStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.adminStatValue, { color: colors.white }]}>{adminStats.totalEventRegistrations}</Text>
                  <Text style={[styles.adminStatLabel, { color: colors.textSecondary }]}>Event Bookings</Text>
                </View>
                <View style={[styles.adminStatCard, { backgroundColor: colors.surface, borderColor: colors.border, minWidth: '95%' }]}>
                  <Text style={[styles.adminStatValue, { color: colors.white }]}>{adminStats.totalClubMembers}</Text>
                  <Text style={[styles.adminStatLabel, { color: colors.textSecondary }]}>Total Club Members</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionHeaderRow}>
              <Text style={[styles.countText, { color: colors.textSecondary, fontWeight: '600' }]}>
                {adminTab === 'Clubs' ? `${clubsRaw.length} Clubs` : `${events.length} Events`}
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={adminTab === 'Clubs' ? openClubCreate : openEventCreate}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={[styles.addBtnText, { color: colors.white }]}>
                  {adminTab === 'Clubs' ? 'New Club' : 'New Event'}
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : adminTab === 'Clubs' ? (
              clubsRaw.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="people-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyTitle, { color: colors.white }]}>No clubs available</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Create a club to manage membership rosters.</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
                  {clubsRaw.map((item) => (
                    <View key={(item.id || item._id).toString()}>
                      {renderAdminClubItem({ item })}
                    </View>
                  ))}
                </View>
              )
            ) : (
              events.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyTitle, { color: colors.white }]}>No events available</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Create an event using the pickers above.</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
                  {events.map((item) => (
                    <View key={(item.id || item._id).toString()}>
                      {renderAdminEventItem({ item })}
                    </View>
                  ))}
                </View>
              )
            )}
          </ScrollView>
        )}

        {/* Dynamic Participants/Members Roster modal drawer */}
        {showRosterModal && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 1000, paddingTop: 50 }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowRosterModal(false)} style={styles.headerBtn}>
                <Ionicons name="close-outline" size={24} color={colors.white} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.headerTitle, { color: colors.white }]} numberOfLines={1}>
                  {rosterType === 'event' ? 'Event Registrations' : 'Club Members'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                  {rosterTargetName}
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {rosterLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : rosterData.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: colors.white }]}>No roster records</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>There are no students registered yet.</Text>
              </View>
            ) : (
              <FlatList
                data={rosterData}
                keyExtractor={(item) => item.registrationId || item.membershipId || item.userId || Math.random().toString()}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item, index }) => (
                  <View style={[styles.memberListItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>{index + 1}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.white, fontSize: 14 }]}>{item.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>
                        Roll No: {item.rollNumber || 'N/A'} • Section: {item.section || 'N/A'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                        Email: {item.email || 'N/A'}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        Date: {formatDate(item.registeredAt || item.joinedAt)}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}
      </SafeAreaView>
    );
  }

  // 2. STUDENT DASHBOARD VIEW
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* STUDENT HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: colors.white }]}>Events & Clubs</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Discover campus activities</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* SEGMENT SWITCHER */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Dashboard' ? { borderBottomColor: colors.primary } : null]}
          onPress={() => {
            setActiveTab('Dashboard');
            setSelectedCategory('All');
            setSearch('');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'Dashboard' ? colors.primary : colors.textSecondary, fontWeight: activeTab === 'Dashboard' ? '700' : '500' }]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Events' ? { borderBottomColor: colors.primary } : null]}
          onPress={() => {
            setActiveTab('Events');
            setSelectedCategory('All');
            setSearch('');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'Events' ? colors.primary : colors.textSecondary, fontWeight: activeTab === 'Events' ? '700' : '500' }]}>
            Events
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Clubs' ? { borderBottomColor: colors.primary } : null]}
          onPress={() => {
            setActiveTab('Clubs');
            setSelectedCategory('All');
            setSearch('');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'Clubs' ? colors.primary : colors.textSecondary, fontWeight: activeTab === 'Clubs' ? '700' : '500' }]}>
            Clubs
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab !== 'Dashboard' && (
        /* FILTER BUTTONS & SEARCH BAR */
        <View style={styles.controlsSection}>
          <View style={styles.searchAndButtonRow}>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                placeholder={activeTab === 'Events' ? "Search events..." : "Search clubs..."}
                value={search}
                onChangeText={setSearch}
                style={[styles.searchInput, { color: colors.white }]}
                placeholderTextColor={colors.textMuted}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {activeTab === 'Events' ? (
              <TouchableOpacity
                onPress={() => router.push('/(main)/my-registrations')}
                style={[styles.iconLinkBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Ionicons name="ticket" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.iconLinkBtnText, { color: colors.white }]}>Tickets</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/(main)/saved-clubs')}
                style={[styles.iconLinkBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={16} color={colors.danger} style={{ marginRight: 4 }} />
                <Text style={[styles.iconLinkBtnText, { color: colors.white }]}>Saved</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* DATE CHIPS (EVENTS ONLY) */}
          {activeTab === 'Events' && (
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
                  <Text style={[styles.chipText, { color: selectedDateChip === item ? colors.white : colors.textSecondary, fontWeight: selectedDateChip === item ? '600' : '400' }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}

          {/* CATEGORY CHIPS */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={activeTab === 'Events' ? CATEGORIES : CLUB_CATEGORIES}
            keyExtractor={(item) => item}
            style={styles.categoryChipsList}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
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
                <Text style={[styles.chipText, { color: selectedCategory === item ? colors.white : colors.textSecondary, fontWeight: selectedCategory === item ? '600' : '400' }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* MAIN CONTENT */}
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            onPress={loadDashboardData}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'Dashboard' ? (
        /* STUDENT DASHBOARD VIEW */
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* STATS COUNT SUMMARY CARDS */}
          <View style={[styles.statsContainer, { marginTop: 12, marginBottom: 16 }]}>
            <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setActiveTab('Events')}>
              <View style={[styles.statIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="calendar-outline" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.white }]}>{upcomingEventsCount}</Text>
              <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Upcoming Events</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setActiveTab('Clubs')}>
              <View style={[styles.statIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="people-outline" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.white }]}>{joinedClubsCount}</Text>
              <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Joined Clubs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(main)/my-registrations')}>
              <View style={[styles.statIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="ticket-outline" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.white }]}>{myRegistrationsCount}</Text>
              <Text style={[styles.statTitle, { color: colors.textSecondary }]}>My Registrations</Text>
            </TouchableOpacity>
          </View>

          {/* UPCOMING EVENTS */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.white, marginBottom: 12 }}>Upcoming Events</Text>
            {events.slice(0, 5).map((item) => (
              <View key={(item.id || item._id).toString()}>
                {renderStudentEvent({ item })}
              </View>
            ))}
            {events.length === 0 && (
              <View style={[styles.emptyBox, { marginTop: 10, padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface }]}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.white, fontSize: 14, marginTop: 8 }]}>No events available</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontSize: 12 }]}>Check back later for upcoming campus events.</Text>
              </View>
            )}
          </View>

          {/* POPULAR CLUBS */}
          <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.white, marginBottom: 12 }}>Popular Clubs</Text>
            {clubsRaw.slice(0, 3).map((item) => (
              <View key={(item.id || item._id).toString()}>
                {renderStudentClub({ item })}
              </View>
            ))}
            {clubsRaw.length === 0 && (
              <View style={[styles.emptyBox, { marginTop: 10, padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface }]}>
                <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.white, fontSize: 14, marginTop: 8 }]}>No clubs available</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontSize: 12 }]}>Check back later for campus clubs.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : activeTab === 'Events' ? (
        events.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.white }]}>No events available</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Check back later for upcoming campus events.</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => (item.id || item._id).toString()}
            renderItem={renderStudentEvent}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        clubs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.white }]}>No clubs available</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Try adjusting your search query or filters.</Text>
          </View>
        ) : (
          <FlatList
            data={clubs}
            keyExtractor={(item) => (item.id || item._id).toString()}
            renderItem={renderStudentClub}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },

  // Tabs Style
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14 },

  // Controls section
  controlsSection: { paddingHorizontal: 16, paddingTop: 12 },
  searchAndButtonRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13, height: '100%', paddingVertical: 0 },
  iconLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconLinkBtnText: { fontSize: 13, fontWeight: '700' },
  dateChipsList: { flexGrow: 0, height: 34, marginBottom: 8 },
  categoryChipsList: { flexGrow: 0, height: 34, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
  },
  chipText: { fontSize: 11 },

  // Listing loader & states
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
  emptyBox: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySubtitle: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },

  // Event Card rendering style
  eventCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  eventCategory: {
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventDesc: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', width: '48%' },
  metaText: { fontSize: 11 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  clubTag: { fontSize: 11 },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Club Card rendering style
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  clubLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clubLogoImage: { width: '100%', height: '100%', borderRadius: 11 },
  clubInfo: { flex: 1 },
  clubNameText: { fontSize: 14, fontWeight: '700' },
  clubCategory: { fontSize: 12, marginTop: 2 },
  clubMembersRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  clubMembersCount: { fontSize: 12 },

  // Admin styles
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  countText: { fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  adminItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemDetail: { fontSize: 12, marginTop: 2 },
  itemActionRow: { flexDirection: 'row', alignItems: 'center' },
  actionIconBtn: { padding: 6, marginLeft: 8 },

  formContainer: { flex: 1, padding: 16 },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700' },

  // Admin Stats dashboard styling
  adminStatCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    minHeight: 70,
  },
  adminStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  adminStatLabel: {
    fontSize: 10,
    marginTop: 3,
  },

  // Modal / Roster styling
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
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
  avatarText: { fontSize: 13, fontWeight: '800' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '700' },
  memberRole: { fontSize: 12, marginTop: 2 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewContainer: {
    height: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadActionBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  removeImageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
