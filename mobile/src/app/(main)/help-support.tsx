import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const faqs = [
  {
    question: 'How do I report a lost item?',
    answer:
      'Go to Lost & Found from the bottom navigation and select Report Lost. Enter the item details and submit the report.',
  },
  {
    question: 'How do I report a found item?',
    answer:
      'Open Lost & Found and choose Report Found. Provide the item details, location and other useful information.',
  },
  {
    question: 'How can I contact KitSphere support?',
    answer:
      'You can contact the KitSphere support team using the Contact Support option below.',
  },
  {
    question: 'What should I do if I find someone’s ID card?',
    answer:
      'Report it through Lost & Found with the location where you found it. Avoid sharing sensitive information publicly.',
  },
  {
    question: 'Can I change my profile information?',
    answer:
      'Profile editing is currently being prepared and will be available in a future update.',
  },
];

export default function HelpSupportScreen() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const contactSupport = async () => {
    const email = 'support@kitsphere.app';

    try {
      await Linking.openURL(`mailto:${email}`);
    } catch {
      Alert.alert(
        'Contact Support',
        `Please email us at ${email}`,
      );
    }
  };

  const reportProblem = () => {
    router.push('/(main)/rate-feedback');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Help & Support</Text>
            <Text style={styles.subtitle}>
              We're here to help you
            </Text>
          </View>
        </View>

        {/* Support Banner */}
        <View style={styles.supportBanner}>
          <View style={styles.supportIcon}>
            <Ionicons
              name="headset-outline"
              size={28}
              color="#5AA9FF"
            />
          </View>

          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>
              Need assistance?
            </Text>

            <Text style={styles.supportText}>
              Find answers or contact the KitSphere support
              team.
            </Text>
          </View>
        </View>

        {/* Support Actions */}
        <Text style={styles.sectionTitle}>
          Support
        </Text>

        <View style={styles.card}>
          <SupportAction
            icon="mail-outline"
            title="Contact Support"
            subtitle="Get help from the KitSphere team"
            onPress={contactSupport}
          />

          <SupportAction
            icon="bug-outline"
            title="Report a Problem"
            subtitle="Tell us if something isn't working"
            onPress={reportProblem}
          />

          <SupportAction
            icon="star-outline"
            title="Rate & Feedback"
            subtitle="Share your experience with us"
            onPress={() =>
              router.push('/(main)/rate-feedback')
            }
            last
          />
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>
          Frequently Asked Questions
        </Text>

        <View style={styles.card}>
          {faqs.map((faq, index) => {
            const isOpen = expanded === index;

            return (
              <View
                key={faq.question}
                style={[
                  styles.faqItem,
                  index !== faqs.length - 1 &&
                    styles.faqBorder,
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() =>
                    setExpanded(isOpen ? null : index)
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.questionText}>
                    {faq.question}
                  </Text>

                  <Ionicons
                    name={
                      isOpen
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={18}
                    color="#7E899B"
                  />
                </TouchableOpacity>

                {isOpen && (
                  <Text style={styles.answerText}>
                    {faq.answer}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* App Information */}
        <Text style={styles.sectionTitle}>
          App Information
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Application
            </Text>

            <Text style={styles.infoValue}>
              KitSphere
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Version
            </Text>

            <Text style={styles.infoValue}>
              1.0.0
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Platform
            </Text>

            <Text style={styles.infoValue}>
              Mobile
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          KitSphere • Making campus life easier
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SupportAction({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionRow,
        !last && styles.actionBorder,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.actionIcon}>
        <Ionicons
          name={icon}
          size={20}
          color="#5AA9FF"
        />
      </View>

      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    marginBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#111722',
    borderWidth: 1,
    borderColor: '#202B3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  subtitle: {
    color: '#7E899B',
    fontSize: 12,
    marginTop: 3,
  },

  supportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1726',
    borderWidth: 1,
    borderColor: '#1D3957',
    borderRadius: 20,
    padding: 17,
    marginBottom: 27,
  },

  supportIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#102840',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  supportContent: {
    flex: 1,
  },

  supportTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  supportText: {
    color: '#8390A3',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#0F1621',
    borderWidth: 1,
    borderColor: '#202B3A',
    borderRadius: 18,
    paddingHorizontal: 15,
    marginBottom: 27,
  },

  actionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionBorder: {
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

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  actionSubtitle: {
    color: '#687386',
    fontSize: 10,
    marginTop: 4,
  },

  faqItem: {
    paddingVertical: 15,
  },

  faqBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#202B3A',
  },

  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  questionText: {
    flex: 1,
    color: '#E3E8F0',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    paddingRight: 10,
  },

  answerText: {
    color: '#7E899B',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 10,
    paddingRight: 8,
  },

  infoCard: {
    backgroundColor: '#0F1621',
    borderWidth: 1,
    borderColor: '#202B3A',
    borderRadius: 18,
    paddingHorizontal: 15,
    marginBottom: 28,
  },

  infoRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#202B3A',
  },

  infoLabel: {
    color: '#7E899B',
    fontSize: 11,
  },

  infoValue: {
    color: '#DDE3EC',
    fontSize: 12,
    fontWeight: '600',
  },

  footer: {
    color: '#586273',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});