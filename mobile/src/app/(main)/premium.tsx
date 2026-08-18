import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const features = [
  {
    icon: 'flash-outline',
    title: 'Priority Services',
    description: 'Get priority access to selected campus services.',
  },
  {
    icon: 'search-outline',
    title: 'Advanced Search',
    description: 'Find campus resources faster with advanced tools.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Exclusive Features',
    description: 'Unlock additional KitSphere student utilities.',
  },
  {
    icon: 'rocket-outline',
    title: 'Early Access',
    description: 'Get access to selected new features first.',
  },
] as const;

export default function PremiumScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>KitSphere Premium</Text>

          <View style={styles.badge}>
            <Ionicons
              name="diamond"
              size={15}
              color="#FFB347"
            />

            <Text style={styles.badgeText}>
              COMING SOON
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.crown}>
            <Ionicons
              name="diamond"
              size={38}
              color="#FFB347"
            />
          </View>

          <Text style={styles.heroTitle}>
            More power for your campus life.
          </Text>

          <Text style={styles.heroDescription}>
            KitSphere Premium will introduce additional tools,
            benefits and advanced campus services.
          </Text>

          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>
              COMING SOON
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Planned Premium Features
        </Text>

        {features.map((feature) => (
          <View
            key={feature.title}
            style={styles.featureCard}
          >
            <View style={styles.featureIcon}>
              <Ionicons
                name={feature.icon}
                size={23}
                color="#5AA9FF"
              />
            </View>

            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>
                {feature.title}
              </Text>

              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>
            </View>
          </View>
        ))}
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  header: {
    paddingTop: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#2A2115',
  },

  badgeText: {
    color: '#FFB347',
    fontSize: 9,
    fontWeight: '800',
  },

  hero: {
    padding: 25,
    borderRadius: 25,
    backgroundColor: '#0A111D',
    borderWidth: 1,
    borderColor: '#2B2A24',
    alignItems: 'center',
  },

  crown: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#2B2112',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
  },

  heroDescription: {
    color: '#8E99AA',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },

  comingSoon: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#1479E8',
  },

  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 29,
    marginBottom: 13,
  },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 17,
    backgroundColor: '#0F1621',
    borderWidth: 1,
    borderColor: '#202B3A',
    marginBottom: 11,
  },

  featureIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: '#102840',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  featureDescription: {
    color: '#7E899B',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
});