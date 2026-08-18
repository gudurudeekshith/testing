import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Linking,
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
import { getCurrentUser } from '../../utils/auth';
import { useTheme } from '../../theme/ThemeContext';

const { width } = Dimensions.get('window');

type User = {
  name?: string;
  email?: string;
  rollNumber?: string;
  section?: string;
  phone?: string;
};

type Feature = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  url?: string;
  enabled: boolean;
  comingSoon?: boolean;
};

const searchableFeatures: Feature[] = [
  {
    id: 'lost-found',
    title: 'Lost & Found',
    subtitle: 'Find or report items',
    icon: 'search-outline',
    route: '/(main)/lost-found',
    enabled: true,
  },
  {
    id: 'xerox',
    title: 'Xerox',
    subtitle: 'Print documents easily',
    icon: 'print-outline',
    enabled: true,
    comingSoon: true,
  },
  {
    id: 'papers',
    title: 'Previous Papers',
    subtitle: 'Access question papers',
    icon: 'document-text-outline',
    enabled: true,
    comingSoon: true,
  },
  {
    id: 'attendance',
    title: 'Attendance',
    subtitle: 'Track your attendance',
    icon: 'calendar-outline',
    url: 'https://tscms-kitsw.aptonline.in/UMS',
    enabled: true,
  },
  {
    id: 'results',
    title: 'Results',
    subtitle: 'View academic results',
    icon: 'school-outline',
    url: 'https://www.kitswexams.com/',
    enabled: true,
  },
  {
    id: 'website',
    title: 'Official Website',
    subtitle: 'Visit college website',
    icon: 'globe-outline',
    url: 'https://kitsw.ac.in/',
    enabled: true,
  },
  {
    id: 'events',
    title: 'Events & Clubs',
    subtitle: 'Discover campus events',
    icon: 'people-outline',
    route: '/(main)/events-clubs',
    enabled: true,
  },
  {
    id: 'internships',
    title: 'Internships',
    subtitle: 'Offline & online opportunities',
    icon: 'briefcase-outline',
    url: 'https://unstop.com/',
    enabled: true,
  },
  {
    id: 'hackathons',
    title: 'Hackathons',
    subtitle: 'Build & compete',
    icon: 'code-slash-outline',
    url: 'https://unstop.com/',
    enabled: true,
  },
  {
    id: 'announcements',
    title: 'Announcements',
    subtitle: 'Important campus updates',
    icon: 'megaphone-outline',
    enabled: true,
    comingSoon: true,
  },
];

const features: Feature[] = searchableFeatures;

const galleryItems = [
  {
    id: 'campus-life',
    title: 'Campus Life',
    subtitle: 'Everyday moments, events, and opportunities',
    source: require('../../../assets/images/logo-glow.png'),
  },
  {
    id: 'research',
    title: 'Innovation',
    subtitle: 'Build, learn, and accelerate your goals',
    source: require('../../../assets/images/splash-icon.png'),
  },
  {
    id: 'connect',
    title: 'Connected Campus',
    subtitle: 'One place for services and updates',
    source: require('../../../assets/images/kitsphere-logo.png'),
  },
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startBackgroundAnimation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUser();
    }, [])
  );

  const filteredSearchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return searchableFeatures.filter((feature) =>
      feature.title.toLowerCase().includes(query) ||
      feature.subtitle.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      
      setUser((prevUser) => {
        if (JSON.stringify(prevUser) === JSON.stringify(currentUser)) {
          return prevUser;
        }
        return currentUser;
      });

      // Try to load a locally saved profile photo (profile screen saves under kitsphere_profile_photo_<id>)
      try {
        if (currentUser?.id) {
          const saved = await (
            await import('@react-native-async-storage/async-storage')
          ).default.getItem(`kitsphere_profile_photo_${currentUser.id}`);

          setProfilePhoto((prevPhoto) => {
            if (prevPhoto === saved) {
              return prevPhoto;
            }
            return saved;
          });
        } else {
          setProfilePhoto(null);
        }
      } catch (photoErr) {
        console.error('Error loading profile photo:', photoErr);
        setProfilePhoto(null);
      }
    } catch (error) {
      console.error('Home user loading error:', error);
    }
  };

  const startBackgroundAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const firstName = user?.name?.trim().split(' ')[0] || 'Student';
  const rollNumber = user?.rollNumber?.toUpperCase() || 'Roll number unavailable';

  const handleFeaturePress = async (feature: Feature) => {
    if (!feature.enabled) {
      return;
    }

    if (feature.route) {
      router.push(feature.route as any);
      return;
    }

    if (feature.url) {
      try {
        const supported = await Linking.canOpenURL(feature.url);
        if (supported) {
          await Linking.openURL(feature.url);
          return;
        }
      } catch (error) {
        console.error('External link error:', error);
      }
    }

    Alert.alert(
      'Under Development',
      'This feature is currently under development. Please visit daily for updates about the Campus Connect app (KitSphere).',
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroContainer}>
          <Animated.View
            style={[
              styles.animatedBackground,
              {
                transform: [{ scale }],
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <View
              style={[
                styles.backgroundOverlay,
                {
                  backgroundColor: colors.background,
                },
              ]}
            />
          </Animated.View>

          <View style={styles.topBar}>
            <View>
              <Text style={[styles.brand, { color: colors.white }]}>KitSphere</Text>
              <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>Campus life, simplified.</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.notificationButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={21} color={colors.white} />
              <View style={[styles.notificationDot, { backgroundColor: colors.primary }]} />
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeContainer}>
            <View style={styles.profileRow}>
              <View style={styles.avatarWrap}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.avatarInitial, { color: colors.white }]}>{(firstName || 'S').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>

              <View style={styles.nameColumn}>
                <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back 👋</Text>
                <Text style={[styles.welcomeName, { color: colors.white }]} numberOfLines={1}>{firstName}</Text>

                <View style={styles.rollRow}>
                  <Ionicons name="card-outline" size={15} color={colors.primary} />
                  <Text style={[styles.rollText, { color: colors.textSecondary }]}>{rollNumber}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.chooseText, { color: colors.textSecondary }]}>Choose a feature to continue</Text>
          </View>
        </View>

        <View style={styles.searchCardWrap}>
          <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.primary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search features..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.white }]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {filteredSearchResults.length > 0 ? (
            <View style={[styles.searchResults, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {filteredSearchResults.slice(0, 4).map((feature) => (
                <TouchableOpacity
                  key={feature.id}
                  style={styles.searchResultItem}
                  activeOpacity={0.8}
                  onPress={() => handleFeaturePress(feature)}
                >
                  <Ionicons name={feature.icon} size={16} color={colors.primary} />
                  <Text style={[styles.searchResultText, { color: colors.white }]}>{feature.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.carouselContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.white }]}>Highlights</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Campus vibe</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselTrack}>
            {galleryItems.map((item) => (
              <View key={item.id} style={[styles.carouselCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Image source={item.source} style={styles.carouselImage} resizeMode="cover" />
                <View style={styles.carouselTextWrap}>
                  <Text style={[styles.carouselTitle, { color: colors.white }]}>{item.title}</Text>
                  <Text style={[styles.carouselSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statsContainer}>
          <StatCard icon="megaphone-outline" title="Announcements" value="—" colors={colors} />
          <StatCard icon="calendar-outline" title="Events" value="—" colors={colors} />
          <StatCard icon="briefcase-outline" title="Opportunities" value="—" colors={colors} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.white }]}>Campus Services</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Everything you need in one place</Text>
        </View>

        <View style={styles.featureGrid}>
          {features.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} colors={colors} onPress={() => handleFeaturePress(feature)} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.white }]}>Recent Updates</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Stay updated with campus life</Text>
        </View>

        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          </View>

          <Text style={[styles.emptyTitle, { color: colors.white }]}>No recent updates</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Announcements and campus updates will appear here.</Text>
        </View>

        <Text style={[styles.footer, { color: colors.textMuted }]}>KitSphere • Making campus life easier</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, title, value, colors }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string; colors: any; }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.surfaceSecondary }]}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>

      <Text style={[styles.statValue, { color: colors.white }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

function FeatureCard({ feature, colors, onPress }: { feature: Feature; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[
        styles.featureCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: feature.enabled ? 1 : 0.72,
        },
      ]}
      activeOpacity={feature.enabled ? 0.72 : 1}
      onPress={onPress}
    >
      <View style={[styles.featureIcon, { backgroundColor: colors.surfaceSecondary }]}>
        <Ionicons name={feature.icon} size={22} color={feature.enabled ? colors.primary : colors.textMuted} />
      </View>

      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: colors.white }]} numberOfLines={1}>{feature.title}</Text>
        <Text style={[styles.featureSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>{feature.subtitle}</Text>
      </View>

      {feature.comingSoon ? (
        <View style={[styles.comingSoonBadge, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.comingSoonText, { color: colors.textMuted }]}>Soon</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 35 },
  heroContainer: {
    height: 330,
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  animatedBackground: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.82,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  brand: { fontSize: 22, fontWeight: '900', letterSpacing: 0.3 },
  brandSubtitle: { fontSize: 10, marginTop: 2 },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 30,
    zIndex: 2,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  welcomeName: { fontSize: 34, fontWeight: '900', marginTop: 3, maxWidth: width - 32 },
  rollRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9, gap: 7 },
  rollText: { fontSize: 12, fontWeight: '600' },
  chooseText: { fontSize: 13, marginTop: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatarWrap: { width: 68, height: 68, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 68, height: 68, borderRadius: 999 },
  avatarPlaceholder: { width: 68, height: 68, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 26, fontWeight: '800' },
  nameColumn: { flex: 1 },
  searchCardWrap: { paddingHorizontal: 16, marginTop: 10 },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
  searchResults: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  searchResultText: { fontSize: 13, fontWeight: '600' },
  carouselContainer: { marginTop: 18, paddingHorizontal: 16 },
  carouselTrack: { paddingRight: 16, gap: 12 },
  carouselCard: {
    width: width * 0.72,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 4,
  },
  carouselImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#0d1b2a',
  },
  carouselTextWrap: { paddingHorizontal: 12, paddingVertical: 10 },
  carouselTitle: { fontSize: 16, fontWeight: '800' },
  carouselSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  statsContainer: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 16,
    marginTop: 18,
    zIndex: 5,
  },
  statCard: {
    flex: 1,
    minHeight: 105,
    borderRadius: 16,
    borderWidth: 1,
    padding: 11,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', marginTop: 8 },
  statTitle: { fontSize: 9, marginTop: 2 },
  sectionHeader: { paddingHorizontal: 16, marginTop: 30, marginBottom: 13 },
  sectionTitle: { fontSize: 19, fontWeight: '800' },
  sectionSubtitle: { fontSize: 11, marginTop: 4 },
  featureGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  featureCard: { width: (width - 42) / 2, minHeight: 118, borderRadius: 17, borderWidth: 1, padding: 13, position: 'relative' },
  featureIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  featureContent: { marginTop: 11, paddingRight: 4 },
  featureTitle: { fontSize: 13, fontWeight: '800' },
  featureSubtitle: { fontSize: 9.5, lineHeight: 14, marginTop: 4 },
  comingSoonBadge: { position: 'absolute', top: 11, right: 10, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  comingSoonText: { fontSize: 7.5, fontWeight: '800' },
  emptyCard: { marginHorizontal: 16, minHeight: 145, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25 },
  emptyIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '800' },
  emptySubtitle: { fontSize: 10, textAlign: 'center', lineHeight: 15, marginTop: 5 },
  footer: { textAlign: 'center', fontSize: 9, marginTop: 28 },
});