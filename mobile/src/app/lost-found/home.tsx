import React, { useEffect, useState } from 'react';
import {
  Alert,
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

import {
  getCurrentUser,
  logout,
} from '../../utils/auth';

const categories = [
  { name: 'Electronics', icon: 'phone-portrait-outline' },
  { name: 'ID Cards', icon: 'card-outline' },
  { name: 'Books', icon: 'book-outline' },
  { name: 'Bags', icon: 'briefcase-outline' },
  { name: 'Keys', icon: 'key-outline' },
  { name: 'Accessories', icon: 'watch-outline' },
  { name: 'Documents', icon: 'document-text-outline' },
  { name: 'Other', icon: 'grid-outline' },
] as const;

const recentReports = [
  {
    title: 'Black Backpack',
    type: 'Found',
    location: 'Library',
    date: 'Aug 12, 2026',
    icon: 'briefcase-outline',
  },
  {
    title: 'Student ID Card',
    type: 'Lost',
    location: 'Main Block',
    date: 'Aug 11, 2026',
    icon: 'card-outline',
  },
  {
    title: 'Scientific Calculator',
    type: 'Found',
    location: 'CSE Laboratory',
    date: 'Aug 10, 2026',
    icon: 'calculator-outline',
  },
] as const;

const steps = [
  ['1', 'Report'],
  ['2', 'Search'],
  ['3', 'Match'],
  ['4', 'Verify'],
  ['5', 'Return'],
] as const;

export default function LostFoundHome() {
  const [user, setUser] = useState<any | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Unable to load user:', error);
    }
  };

  const handleLogout = () => {
    if (loggingOut) {
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout from KitSphere?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ],
    );
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);

      await logout();

      setProfileVisible(false);

      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);

      Alert.alert(
        'Logout Failed',
        'Unable to logout. Please try again.',
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const getInitial = () => {
    if (!user?.name) {
      return 'K';
    }

    return user.name.trim().charAt(0).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>KitSphere</Text>

            <Text style={styles.subtitle}>
              Campus Lost & Found
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.8}
            onPress={() =>
              setProfileVisible((value) => !value)
            }
          >
            <Text style={styles.profileInitial}>
              {getInitial()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Menu */}
        {profileVisible && (
          <View style={styles.profileMenu}>
            <View style={styles.profileHeader}>
              <View style={styles.largeProfileIcon}>
                <Text style={styles.largeProfileInitial}>
                  {getInitial()}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text
                  style={styles.profileName}
                  numberOfLines={1}
                >
                  {user?.name || 'KitSphere Student'}
                </Text>

                <Text
                  style={styles.profileEmail}
                  numberOfLines={1}
                >
                  {user?.email || 'Student account'}
                </Text>
              </View>
            </View>

            <View style={styles.profileDivider} />

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loggingOut}
              activeOpacity={0.8}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#FF6B6B"
              />

              <Text style={styles.logoutText}>
                {loggingOut ? 'Logging out...' : 'Logout'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />

          <Text style={styles.heroSmall}>
            CAMPUS COMMUNITY
          </Text>

          <Text style={styles.heroTitle}>
            Lost Something?{'\n'}
            <Text style={styles.heroHighlight}>
              Found Something?
            </Text>
          </Text>

          <Text style={styles.heroDescription}>
            Reconnect lost belongings with their rightful
            owners across campus.
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
            >
              <Ionicons
                name="search-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text style={styles.primaryButtonText}>
                Report Lost
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add-circle-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text style={styles.secondaryButtonText}>
                Report Found
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Find an Item
          </Text>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={21}
              color="#8B95A7"
            />

            <TextInput
              placeholder="Search lost or found items..."
              placeholderTextColor="#7B8597"
              style={styles.searchInput}
            />

            <TouchableOpacity activeOpacity={0.8}>
              <Ionicons
                name="options-outline"
                size={21}
                color="#8B95A7"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Quick Categories
            </Text>

            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.viewAll}>
                View all
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.name}
                style={styles.categoryCard}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons
                    name={category.icon}
                    size={23}
                    color="#5AA9FF"
                  />
                </View>

                <Text style={styles.categoryText}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Reports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Recent Reports
            </Text>

            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.viewAll}>
                See all
              </Text>
            </TouchableOpacity>
          </View>

          {recentReports.map((report) => (
            <TouchableOpacity
              key={`${report.title}-${report.date}`}
              style={styles.reportCard}
              activeOpacity={0.8}
            >
              <View style={styles.reportImagePlaceholder}>
                <Ionicons
                  name={report.icon}
                  size={30}
                  color="#6DAEFF"
                />
              </View>

              <View style={styles.reportContent}>
                <View style={styles.reportTitleRow}>
                  <Text style={styles.reportTitle}>
                    {report.title}
                  </Text>

                  <View
                    style={[
                      styles.typeBadge,
                      report.type === 'Lost'
                        ? styles.lostBadge
                        : styles.foundBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        report.type === 'Lost'
                          ? styles.lostBadgeText
                          : styles.foundBadgeText,
                      ]}
                    >
                      {report.type}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color="#8792A5"
                  />

                  <Text style={styles.metaText}>
                    {report.location}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color="#8792A5"
                  />

                  <Text style={styles.metaText}>
                    {report.date}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#667085"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            How It Works
          </Text>

          <View style={styles.stepsContainer}>
            {steps.map(([number, label]) => (
              <View style={styles.step} key={number}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>
                    {number}
                  </Text>
                </View>

                <Text style={styles.stepLabel}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footerText}>
          KitSphere • Making campus life easier
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#05070B',
  },

  container: {
    paddingBottom: 40,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brand: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  subtitle: {
    color: '#7E899B',
    fontSize: 12,
    marginTop: 3,
  },

  profileButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#1479E8',
    borderWidth: 1,
    borderColor: '#3B91F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInitial: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  profileMenu: {
    position: 'absolute',
    zIndex: 100,
    top: 78,
    right: 16,
    width: 265,
    backgroundColor: '#0B111A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#263244',
    padding: 15,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 10,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  largeProfileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1479E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  largeProfileInitial: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  profileEmail: {
    color: '#7E899B',
    fontSize: 11,
    marginTop: 4,
  },

  profileDivider: {
    height: 1,
    backgroundColor: '#202B3A',
    marginVertical: 14,
  },

  logoutButton: {
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: '#211417',
    borderWidth: 1,
    borderColor: '#4A2529',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '700',
  },

  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 24,
    borderRadius: 26,
    backgroundColor: '#0A111D',
    borderWidth: 1,
    borderColor: '#1D2939',
    overflow: 'hidden',
  },

  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#0B315C',
    top: -90,
    right: -80,
    opacity: 0.55,
  },

  heroSmall: {
    color: '#6AAEFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
  },

  heroHighlight: {
    color: '#FF9D18',
  },

  heroDescription: {
    color: '#98A3B5',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
    maxWidth: 320,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },

  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#1479E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#151C27',
    borderWidth: 1,
    borderColor: '#293445',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  section: {
    marginTop: 28,
    paddingHorizontal: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },

  viewAll: {
    color: '#5FA8FF',
    fontSize: 13,
    fontWeight: '600',
  },

  searchContainer: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#101722',
    borderWidth: 1,
    borderColor: '#202B3A',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },

  categoryScroll: {
    gap: 10,
    paddingRight: 16,
  },

  categoryCard: {
    width: 96,
    minHeight: 98,
    borderRadius: 17,
    backgroundColor: '#0F1621',
    borderWidth: 1,
    borderColor: '#202B3A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#102840',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  categoryText: {
    color: '#D9E0EA',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  reportCard: {
    minHeight: 105,
    borderRadius: 18,
    backgroundColor: '#0F1621',
    borderWidth: 1,
    borderColor: '#202B3A',
    marginBottom: 11,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  reportImagePlaceholder: {
    width: 69,
    height: 69,
    borderRadius: 15,
    backgroundColor: '#142235',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  reportContent: {
    flex: 1,
  },

  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },

  reportTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  foundBadge: {
    backgroundColor: '#103A2C',
  },

  lostBadge: {
    backgroundColor: '#432A18',
  },

  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  foundBadgeText: {
    color: '#54D39A',
  },

  lostBadgeText: {
    color: '#FFB36A',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },

  metaText: {
    color: '#8792A5',
    fontSize: 11,
  },

  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },

  step: {
    alignItems: 'center',
    flex: 1,
  },

  stepCircle: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#12253A',
    borderWidth: 1,
    borderColor: '#28547D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumber: {
    color: '#63ABFF',
    fontSize: 13,
    fontWeight: '800',
  },

  stepLabel: {
    color: '#929DAE',
    fontSize: 10,
    marginTop: 7,
    fontWeight: '600',
  },

  footerText: {
    color: '#586273',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 32,
  },
});