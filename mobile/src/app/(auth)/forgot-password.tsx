import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../../services/api';

const EMAIL_REGEX = /^[a-z0-9._%+-]+@kitsw\.ac\.in$/i;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendSeconds((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleResetRequest = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('Please enter your email address.');
      setIsSubmitted(false);
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      setIsSubmitted(false);
      return;
    }

    if (!isOnline) {
      setErrorMessage('No Internet Connection\n\nPlease check your internet connection and try again.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 429) {
        setErrorMessage('Too many requests. Please wait a while and try again.');
        return;
      }

      if (!response.ok) {
        if (typeof data?.message === 'string' && data.message.toLowerCase().includes('couldn\'t send')) {
          setErrorMessage(data.message);
          return;
        }

        setErrorMessage('We couldn\'t send the reset email right now.\n\nPlease try again in a moment.');
        return;
      }

      setIsSubmitted(true);
      setResendSeconds(30);
      setErrorMessage('');
    } catch (error) {
      console.error('Forgot password request error:', error);
      setErrorMessage('Unable to reach KitSphere right now.\n\nPlease try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandSection}>
            <View style={styles.logoMark}>
              <Image
                source={require('../../../assets/images/kitsphere-logo.png')}
                style={styles.logoImage}
              />
            </View>
            <Text style={styles.brand}>KitSphere</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-open-outline" size={28} color="#5AA9FF" />
            </View>

            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.description}>
              If an account exists for this email, we\'ve sent a password reset link.
            </Text>
            <Text style={styles.subtleText}>Please check your inbox and spam folder.</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>Back to Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, resendSeconds > 0 && styles.secondaryButtonDisabled]}
              onPress={resendSeconds === 0 ? handleResetRequest : undefined}
              disabled={resendSeconds > 0 || isLoading}
              activeOpacity={0.8}
            >
              {resendSeconds > 0 ? (
                <Text style={styles.secondaryText}>Resend available in {resendSeconds}s</Text>
              ) : (
                <Text style={styles.secondaryText}>Resend Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandSection}>
          <View style={styles.logoMark}>
            <Image
              source={require('../../../assets/images/kitsphere-logo.png')}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.brand}>KitSphere</Text>
          <Text style={styles.brandSubtitle}>Your campus, connected.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={26} color="#5AA9FF" />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.description}>
            Enter your registered email address and we\'ll send you a secure link to reset your password.
          </Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#7C879A" />
              <TextInput
                value={email}
                onChangeText={(nextValue) => {
                  setEmail(nextValue);
                  if (errorMessage) {
                    setErrorMessage('');
                  }
                }}
                placeholder="yourname@kitsw.ac.in"
                placeholderTextColor="#667085"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                accessibilityLabel="Email address"
              />
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleResetRequest}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={17} color="#5FA8FF" />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityRow}>
          <Ionicons name="shield-checkmark-outline" size={17} color="#5AA9FF" />
          <Text style={styles.securityText}>Password recovery is restricted to official KITSW college accounts.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05070B' },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 30, justifyContent: 'center' },
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoMark: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#102840', borderWidth: 1, borderColor: '#24517A', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoImage: { width: 40, height: 40, resizeMode: 'contain' },
  brand: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  brandSubtitle: { color: '#7E899B', fontSize: 13, marginTop: 5 },
  card: { backgroundColor: '#0B111A', borderRadius: 24, borderWidth: 1, borderColor: '#202B3A', padding: 22 },
  iconContainer: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#0E1F35', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  description: { color: '#C8D0DD', fontSize: 14, lineHeight: 22, marginBottom: 18 },
  subtleText: { color: '#97A3B5', fontSize: 13, lineHeight: 20, marginBottom: 22 },
  fieldContainer: { marginBottom: 18 },
  label: { color: '#DDE3EC', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputContainer: { minHeight: 54, borderRadius: 15, backgroundColor: '#101722', borderWidth: 1, borderColor: '#263244', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  primaryButton: { minHeight: 52, borderRadius: 15, backgroundColor: '#1479E8', alignItems: 'center', justifyContent: 'center', marginTop: 6, flexDirection: 'row' },
  primaryButtonDisabled: { opacity: 0.75 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { minHeight: 50, borderRadius: 15, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#25436F', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secondaryButtonDisabled: { opacity: 0.55 },
  secondaryText: { color: '#A8D2FF', fontSize: 14, fontWeight: '600' },
  backButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 18 },
  backText: { color: '#5FA8FF', fontSize: 13, fontWeight: '600' },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 4 },
  securityText: { color: '#92A0B6', fontSize: 12, lineHeight: 18, flex: 1 },
  errorBox: { backgroundColor: '#261515', borderWidth: 1, borderColor: '#5E2A2A', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: '#F4C7C7', fontSize: 13, lineHeight: 20 },
});