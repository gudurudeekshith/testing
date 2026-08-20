import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { apiRequest, apiUploadImage } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';
import * as ImagePicker from 'expo-image-picker';

const TABS = ['Manage Clubs', 'Manage Events'];

export default function AdminDashboardScreen() {
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState('Manage Clubs');
  const [clubs, setClubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'club' | 'event'>('club');
  const [editId, setEditId] = useState<string | null>(null);

  // Club form fields
  const [clubName, setClubName] = useState('');
  const [clubCategory, setClubCategory] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [clubLogo, setClubLogo] = useState('');
  const [clubEmail, setClubEmail] = useState('');
  const [clubPhone, setClubPhone] = useState('');
  const [clubYear, setClubYear] = useState('');

  // Event form fields
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(''); // YYYY-MM-DD
  const [eventStart, setEventStart] = useState(''); // HH:MM
  const [eventEnd, setEventEnd] = useState(''); // HH:MM
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

  const checkAdmin = async () => {
    const user = await getCurrentUser();
    if (user?.role !== 'admin') {
      setIsAdmin(false);
      Alert.alert('Access Denied', 'Only admins can view this panel.', [
        { text: 'OK', onPress: () => router.replace('/(main)/home') },
      ]);
    } else {
      setIsAdmin(true);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const clubsRes = await apiRequest<any>('/clubs');
      if (clubsRes.success) {
        setClubs(clubsRes.data || []);
      }

      const eventsRes = await apiRequest<any>('/events?date=all');
      if (eventsRes.success) {
        setEvents(eventsRes.data || []);
      }
    } catch (e: any) {
      console.error('Load data error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void checkAdmin();
      void loadData();
    }, [loadData])
  );

  const resetClubForm = () => {
    setClubName('');
    setClubCategory('');
    setClubDesc('');
    setClubLogo('');
    setClubEmail('');
    setClubPhone('');
    setClubYear('');
    setEditId(null);
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventCategory('');
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
    setClubCategory(club.category || '');
    setClubDesc(club.description || '');
    setClubLogo(club.logo || '');
    setClubEmail(club.contactEmail || '');
    setClubPhone(club.contactPhone || '');
    setClubYear(club.establishedYear ? club.establishedYear.toString() : '');
    setIsFormOpen(true);
  };

  const openEventEdit = (event: any) => {
    setFormType('event');
    setEditId(event.id || event._id);
    setEventTitle(event.title || '');
    setEventCategory(event.category || '');
    setEventDesc(event.description || '');
    setEventVenue(event.venue || '');
    setEventCapacity(event.capacity ? event.capacity.toString() : '');
    setEventLat(event.latitude ? event.latitude.toString() : '');
    setEventLng(event.longitude ? event.longitude.toString() : '');
    setEventClubId(event.club?.id || event.club?._id || '');

    // Format date string as YYYY-MM-DD
    try {
      const d = new Date(event.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      setEventDate(`${year}-${month}-${date}`);
    } catch {
      setEventDate('');
    }

    setEventStart(event.startTime || '');
    setEventEnd(event.endTime || '');
    setEventImage(event.image || '');
    setIsFormOpen(true);
  };

  const handleClubSubmit = async () => {
    if (!clubName.trim() || !clubCategory.trim() || !clubDesc.trim()) {
      Alert.alert('Required Info', 'Name, Category and Description are required.');
      return;
    }

    try {
      const payload = {
        name: clubName.trim(),
        category: clubCategory.trim(),
        description: clubDesc.trim(),
        logo: clubLogo.trim() || undefined,
        contactEmail: clubEmail.trim() || undefined,
        contactPhone: clubPhone.trim() || undefined,
        establishedYear: clubYear.trim() ? parseInt(clubYear) : undefined,
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
        void loadData();
      } else {
        Alert.alert('Failed', res.message || 'Operation failed.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred.');
    }
  };

  const handleEventSubmit = async () => {
    if (!eventTitle.trim() || !eventCategory.trim() || !eventDesc.trim() || !eventDate.trim() || !eventStart.trim() || !eventVenue.trim()) {
      Alert.alert('Required Info', 'Title, Category, Desc, Date, Start Time, and Venue are required.');
      return;
    }

    try {
      const payload = {
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        category: eventCategory.trim(),
        date: eventDate.trim(),
        startTime: eventStart.trim(),
        endTime: eventEnd.trim() || undefined,
        venue: eventVenue.trim(),
        capacity: eventCapacity.trim() ? parseInt(eventCapacity) : undefined,
        latitude: eventLat.trim() ? parseFloat(eventLat) : undefined,
        longitude: eventLng.trim() ? parseFloat(eventLng) : undefined,
        club: eventClubId.trim() || undefined,
        image: eventImage.trim() || undefined,
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
        void loadData();
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
              void loadData();
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
              void loadData();
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
              void loadData();
            }
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete event.');
          }
        },
      },
    ]);
  };

  const renderClubItem = ({ item }: { item: any }) => (
    <View style={[styles.adminItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: colors.white }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{item.category} • {item.membersCount || 0} members</Text>
      </View>
      <View style={styles.itemActionRow}>
        <TouchableOpacity style={styles.actionIconBtn} onPress={() => openClubEdit(item)}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleClubDelete(item.id || item._id)}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEventItem = ({ item }: { item: any }) => {
    const isCancelled = item.status === 'cancelled';
    return (
      <View style={[styles.adminItemCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: isCancelled ? 0.6 : 1 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: colors.white }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
            {item.category} • {item.registrationsCount} booked
          </Text>
        </View>
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
    );
  };

  if (!isAdmin) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        <Text style={[styles.headerTitle, { color: colors.white }]}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* TABS */}
      {!isFormOpen && (
        <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t ? { borderBottomColor: colors.primary } : null]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.textSecondary, fontWeight: activeTab === t ? '700' : '500' }]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* FORM OVERLAY */}
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
            <View style={styles.fieldsContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Club Name *</Text>
              <TextInput value={clubName} onChangeText={setClubName} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="eg. Programming Club" placeholderTextColor={colors.textMuted} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
              <TextInput value={clubCategory} onChangeText={setClubCategory} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="eg. Technical" placeholderTextColor={colors.textMuted} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
              <TextInput value={clubDesc} onChangeText={setClubDesc} style={[styles.input, styles.textArea, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} multiline numberOfLines={4} placeholder="About the club..." placeholderTextColor={colors.textMuted} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Club Logo</Text>
              
              {/* Image Preview Panel */}
              <View style={[styles.previewContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {clubLogo ? (
                  <Image source={{ uri: clubLogo }} style={styles.previewImage} resizeMode="cover" />
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
                  style={[styles.uploadActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
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
                  style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]}
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

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleClubSubmit}>
                <Text style={[styles.submitBtnText, { color: colors.white }]}>Save Club</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fieldsContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Event Title *</Text>
              <TextInput value={eventTitle} onChangeText={setEventTitle} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="eg. Coding Contest" placeholderTextColor={colors.textMuted} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
              <TextInput value={eventCategory} onChangeText={setEventCategory} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="eg. Technical" placeholderTextColor={colors.textMuted} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
              <TextInput value={eventDesc} onChangeText={setEventDesc} style={[styles.input, styles.textArea, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} multiline numberOfLines={4} placeholder="Event description..." placeholderTextColor={colors.textMuted} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Date (YYYY-MM-DD) *</Text>
              <TextInput value={eventDate} onChangeText={setEventDate} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="2026-10-15" placeholderTextColor={colors.textMuted} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Start Time (eg. 10:00 AM) *</Text>
              <TextInput value={eventStart} onChangeText={setEventStart} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="10:00 AM" placeholderTextColor={colors.textMuted} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>End Time (eg. 12:00 PM)</Text>
              <TextInput value={eventEnd} onChangeText={setEventEnd} style={[styles.input, { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border }]} placeholder="12:00 PM" placeholderTextColor={colors.textMuted} />

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
                  <Image source={{ uri: eventImage }} style={styles.previewImage} resizeMode="cover" />
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

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleEventSubmit}>
                <Text style={[styles.submitBtnText, { color: colors.white }]}>Save Event</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        /* MAIN LISTS */
        <View style={{ flex: 1 }}>
          <View style={styles.actionHeaderRow}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {activeTab === 'Manage Clubs' ? `${clubs.length} Clubs` : `${events.length} Events`}
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={activeTab === 'Manage Clubs' ? openClubCreate : openEventCreate}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={[styles.addBtnText, { color: colors.white }]}>
                {activeTab === 'Manage Clubs' ? 'New Club' : 'New Event'}
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : activeTab === 'Manage Clubs' ? (
            <FlatList
              data={clubs}
              keyExtractor={(item) => (item.id || item._id).toString()}
              renderItem={renderClubItem}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            />
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => (item.id || item._id).toString()}
              renderItem={renderEventItem}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            />
          )}
        </View>
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
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14 },
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
  fieldsContainer: {},
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700' },
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
});
