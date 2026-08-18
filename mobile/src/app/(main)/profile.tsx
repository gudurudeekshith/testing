import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, logout, getAuthToken, updateStoredUser } from '../../utils/auth';
import { API_BASE_URL as API_BASE_URL_CONST } from '../../services/api';

type User = {
  id?: string;
  name?: string;
  email?: string;
  rollNumber?: string;
  section?: string;
  phone?: string;
};

const PROFILE_PHOTO_PREFIX = 'kitsphere_profile_photo_';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      let currentUser: User | null = null;
      // Prefer fresh profile from backend when token is available
      const token = await getAuthToken();

      if (token) {
        const response = await fetch(`${API_BASE_URL_CONST}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.success && data.user) {
            currentUser = data.user as User;
            setUser(currentUser);
            await AsyncStorage.setItem('user', JSON.stringify(currentUser));
          }
        } else {
          // Fallback to local storage
          currentUser = await getCurrentUser();

          setUser(currentUser);
        }
      } else {
        currentUser = await getCurrentUser();

        setUser(currentUser);
      }

      if (currentUser?.id) {
        const savedPhoto = await AsyncStorage.getItem(
          `${PROFILE_PHOTO_PREFIX}${currentUser.id}`,
        );

        if (savedPhoto) {
          setProfilePhoto(savedPhoto);
        }
      }
    } catch (error) {
      console.error('Profile loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPhotoOptions = () => {
    Alert.alert(
      'Profile Photo',
      'Choose how you want to update your profile photo.',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: chooseFromGallery,
        },
        ...(profilePhoto
          ? [
              {
                text: 'Remove Photo',
                style: 'destructive' as const,
                onPress: removePhoto,
              },
            ]
          : []),
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
      ],
    );
  };

  const chooseFromGallery = async () => {
    try {
      setPhotoLoading(true);

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to choose a profile photo.',
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      await saveProfilePhoto(result.assets[0].uri);
    } catch (error) {
      console.error('Gallery error:', error);

      Alert.alert(
        'Photo Error',
        'Unable to select the photo. Please try again.',
      );
    } finally {
      setPhotoLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      setPhotoLoading(true);

      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow camera access to take a profile photo.',
        );
        return;
      }

      const result =
        await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      await saveProfilePhoto(result.assets[0].uri);
    } catch (error) {
      console.error('Camera error:', error);

      Alert.alert(
        'Photo Error',
        'Unable to take the photo. Please try again.',
      );
    } finally {
      setPhotoLoading(false);
    }
  };

  const saveProfilePhoto = async (uri: string) => {
    if (!user?.id) {
      Alert.alert(
        'Profile Error',
        'Unable to identify your account.',
      );
      return;
    }

    await AsyncStorage.setItem(
      `${PROFILE_PHOTO_PREFIX}${user.id}`,
      uri,
    );

    setProfilePhoto(uri);

    Alert.alert(
      'Profile Photo Updated',
      'Your profile photo has been updated on this device.',
    );
  };

  const removePhoto = async () => {
    if (!user?.id) {
      return;
    }

    try {
      await AsyncStorage.removeItem(
        `${PROFILE_PHOTO_PREFIX}${user.id}`,
      );

      setProfilePhoto(null);

      Alert.alert(
        'Photo Removed',
        'Your profile photo has been removed.',
      );
    } catch (error) {
      console.error('Remove photo error:', error);

      Alert.alert(
        'Error',
        'Unable to remove the profile photo.',
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action permanently deletes your KitSphere account. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ],
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      const token = await (
        await import('../../utils/auth')
      ).getAuthToken();

      if (!token) {
        Alert.alert(
          'Authentication Required',
          'Please login again.',
        );
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL_CONST}/auth/delete-account`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert(
          'Delete Failed',
          data.message ||
            'Unable to delete your account.',
        );
        return;
      }

      if (user?.id) {
        await AsyncStorage.removeItem(
          `${PROFILE_PHOTO_PREFIX}${user.id}`,
        );
      }

      await logout();

      Alert.alert(
        'Account Deleted',
        'Your KitSphere account has been deleted successfully.',
        [
          {
            text: 'Continue',
            onPress: () =>
              router.replace('/(auth)/login'),
          },
        ],
      );
    } catch (error) {
      console.error(
        'Delete account request error:',
        error,
      );

      Alert.alert(
        'Connection Error',
        'Unable to connect to the KitSphere server.',
      );
    }
  };

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditSection(user.section || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const saveProfile = async () => {
      try {
        const trimmedName = editName.trim();
        const trimmedSection = editSection.trim();
        const trimmedPhone = editPhone.trim();

        if (!trimmedName) {
          Alert.alert('Name required', 'Please enter your full name.');
          return;
        }

        if (trimmedPhone && !/^[0-9+\-\s()]{10,15}$/.test(trimmedPhone)) {
          Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
          return;
        }

        setSavingProfile(true);
        const token = await getAuthToken();
        if (!token) {
          Alert.alert('Authentication Required', 'Please login again.');
          router.replace('/(auth)/login');
          return;
        }

        const response = await fetch(`${API_BASE_URL_CONST}/auth/me`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: trimmedName, section: trimmedSection, phone: trimmedPhone }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          Alert.alert('Update Failed', data.message || 'Unable to update profile.');
          return;
        }

        const updatedUser = data.user as User;
        setUser(updatedUser);
        await updateStoredUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setEditing(false);
        Alert.alert('Profile Updated', 'Your profile has been updated successfully.');
      } catch (error) {
        console.error('Save profile error:', error);
        Alert.alert('Connection Error', 'Unable to update profile. Please try again.');
      } finally {
        setSavingProfile(false);
      }
    };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#5AA9FF"
          />
        </View>
      </SafeAreaView>
    );
  }

  const name = user?.name || 'Student';

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={styles.pageTitle}>
          My Profile
        </Text>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={openPhotoOptions}
            activeOpacity={0.8}
            disabled={photoLoading}
          >
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.profileImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            )}

            <View style={styles.cameraButton}>
              {photoLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="camera"
                  size={14}
                  color="#FFFFFF"
                />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>
            {name}
          </Text>

          <Text style={styles.rollNumber}>
            {user?.rollNumber ||
              'Roll number not available'}
          </Text>

          <View style={styles.studentBadge}>
            <Ionicons
              name="school-outline"
              size={14}
              color="#5AA9FF"
            />

            <Text style={styles.studentBadgeText}>
              KITSW Student
            </Text>
          </View>
        </View>

        {/* Student Information */}
        <Text style={styles.sectionTitle}>
          Student Information
        </Text>

        <View style={styles.infoCard}>
          <InfoRow
            icon="person-outline"
            label="Full Name"
            value={user?.name || 'Not available'}
          />

          <InfoRow
            icon="card-outline"
            label="Roll Number"
            value={user?.rollNumber || 'Not available'}
          />

          <InfoRow
            icon="people-outline"
            label="Section"
            value={user?.section || 'Not available'}
          />

          <InfoRow
            icon="mail-outline"
            label="College Email"
            value={
              user?.email ||
              'b24cs280@kitsw.ac.in'
            }
          />

          <InfoRow
            icon="call-outline"
            label="Phone"
            value={user?.phone || 'Not available'}
            last
          />
        </View>

        {editing ? (
          <View style={styles.editorCard}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your full name"
                  style={styles.input}
                  placeholderTextColor="#7E899B"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Section</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={editSection}
                  onChangeText={setEditSection}
                  placeholder="Enter your section"
                  style={styles.input}
                  placeholderTextColor="#7E899B"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#7E899B"
                />
              </View>
            </View>

            <View style={styles.editorActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, savingProfile && styles.secondaryButtonDisabled]}
                onPress={() => setEditing(false)}
                activeOpacity={0.8}
                disabled={savingProfile}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, savingProfile && styles.primaryButtonDisabled]}
                onPress={saveProfile}
                activeOpacity={0.8}
                disabled={savingProfile}
              >
                <Text style={styles.primaryButtonText}>{savingProfile ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.actionCard}>
            <ProfileAction
              icon="create-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => setEditing(true)}
            />

            <ProfileAction
              icon="settings-outline"
              title="Settings"
              subtitle="Manage app preferences"
              onPress={() => router.push('/(main)/settings')}
            />

            <ProfileAction
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get help, FAQs and contact support"
              onPress={() => router.push('/(main)/help-support')}
            />

            <ProfileAction
              icon="star-outline"
              title="Rate & Feedback"
              subtitle="Share your KitSphere experience"
              onPress={() => router.push('/(main)/rate-feedback')}
            />

            <ProfileAction
              icon="log-out-outline"
              title="Logout"
              subtitle="Sign out of your KitSphere account"
              destructive
              onPress={handleLogout}
            />
          </View>
        )}

        {/* Account Management */}
        <Text
          style={[
            styles.sectionTitle,
            styles.accountManagementTitle,
          ]}
        >
          Account Management
        </Text>

        <View style={styles.deleteCard}>
          <View style={styles.deleteIcon}>
            <Ionicons
              name="trash-outline"
              size={21}
              color="#FF6B6B"
            />
          </View>

          <View style={styles.deleteContent}>
            <Text style={styles.deleteTitle}>
              Delete Account
            </Text>

            <Text style={styles.deleteSubtitle}>
              Permanently remove your KitSphere account
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          KitSphere • Making campus life easier
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.infoRowBorder,
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={18}
          color="#5AA9FF"
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ProfileAction({
  icon,
  title,
  subtitle,
  onPress,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.actionIcon,
          destructive &&
            styles.destructiveIcon,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            destructive
              ? '#FF6B6B'
              : '#5AA9FF'
          }
        />
      </View>

      <View style={styles.actionContent}>
        <Text
          style={[
            styles.actionTitle,
            destructive &&
              styles.destructiveText,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.actionSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#596577"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#05070B',
  },

  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    paddingTop: 20,
    marginBottom: 24,
  },

  profileHeader: {
    alignItems: 'center',
    paddingBottom: 27,
  },

  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#102840',
    borderWidth: 2,
    borderColor: '#28547D',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },

  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },

  avatarText: {
    color: '#5AA9FF',
    fontSize: 37,
    fontWeight: '800',
  },

  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: 1,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1479E8',
    borderWidth: 2,
    borderColor: '#05070B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  name: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 14,
  },

  rollNumber: {
    color: '#7E899B',
    fontSize: 12,
    marginTop: 4,
  },

  studentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#102840',
    marginTop: 11,
  },

  studentBadgeText: {
    color: '#5AA9FF',
    fontSize: 10,
    fontWeight: '700',
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  accountManagementTitle: {
    marginTop: 27,
  },

  infoCard: {
    backgroundColor: '#0F1621',
    borderWidth: 1,
    borderColor: '#202B3A',
    borderRadius: 18,
    paddingHorizontal: 15,
    marginBottom: 27,
  },

  infoRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#202B3A',
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#102840',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: '#687386',
    fontSize: 10,
    marginBottom: 4,
  },

  infoValue: {
    color: '#E3E8F0',
    fontSize: 13,
    fontWeight: '600',
  },

  actionCard: {
    backgroundColor: '#0F1621',
    borderWidth: 1,
    borderColor: '#202B3A',
    borderRadius: 18,
    paddingHorizontal: 15,
  },

  actionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#202B3A',
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#102840',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  destructiveIcon: {
    backgroundColor: '#32191D',
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  destructiveText: {
    color: '#FF6B6B',
  },

  actionSubtitle: {
    color: '#687386',
    fontSize: 10,
    marginTop: 4,
  },

  editorCard: {
    backgroundColor: '#0F1621',
    borderWidth: 1,
    borderColor: '#202B3A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    color: '#DDE3EC',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#101722',
    borderWidth: 1,
    borderColor: '#263244',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },

  input: {
    color: '#FFFFFF',
    fontSize: 14,
  },

  editorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#1479E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonDisabled: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#25436F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonDisabled: {
    opacity: 0.7,
  },

  secondaryButtonText: {
    color: '#A8D2FF',
    fontSize: 14,
    fontWeight: '600',
  },

  deleteCard: {
    backgroundColor: '#120C0F',
    borderWidth: 1,
    borderColor: '#402027',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  deleteIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#32191D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  deleteContent: {
    flex: 1,
  },

  deleteTitle: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '700',
  },

  deleteSubtitle: {
    color: '#687386',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#32191D',
  },

  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: '700',
  },

  footer: {
    color: '#586273',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 28,
  },
});
