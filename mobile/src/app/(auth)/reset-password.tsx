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
import { useLocalSearchParams, router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../../services/api';

export default function ResetPasswordScreen() {
  const { token: qsToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(qsToken) ? qsToken[0] : qsToken;

  const [token, setToken] = useState(rawToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'invalid' | 'expired' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (rawToken) {
      setToken(String(rawToken));
    }
  }, [rawToken]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return unsubscribe;
  }, []);

  const handleResetPassword = async () => {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setStatus('invalid');
      setMessage('Invalid Reset Link\n\nThis password reset link is invalid. Please request a new password reset link.');
      return;
    }

    if (!password) {
      setMessage('Please enter a new password.');
      setStatus('error');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      setStatus('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setStatus('error');
      return;
    }

    if (!isOnline) {
      setMessage('No Internet Connection\n\nPlease check your internet connection and try again.');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmedToken, password }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 429) {
        setStatus('error');
        setMessage('Too many requests. Please wait a while and try again.');
        return;
      }

      if (!response.ok) {
        const serverMessage = typeof data?.message === 'string' ? data.message : 'Something went wrong. Please try again later.';

        if (serverMessage.toLowerCase().includes('invalid') || serverMessage.toLowerCase().includes('expired')) {
          setStatus('expired');
          setMessage('Reset Link Expired\n\nThis password reset link has expired. Please request a new password reset link.');
          return;
        }

        setStatus('error');
        setMessage('Something went wrong.\n\nPlease try again later.');
        return;
      }

      setStatus('success');
      setMessage('Password Reset Successful\n\nYour password has been updated successfully. You can now sign in using your new password.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Reset password request error:', error);
      setStatus('error');
      setMessage('Unable to reach KitSphere right now.\n\nPlease try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInvalidState = (title: string, subtitle: string) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={28} color="#FFB454" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{subtitle}</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(auth)/forgot-password')} activeOpacity={0.9}>
        <Text style={styles.primaryText}>Request New Link</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={17} color="#5FA8FF" />
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  if (status === 'invalid' || status === 'expired') {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

          {renderInvalidState(
            status === 'expired' ? 'Reset Link Expired' : 'Invalid Reset Link',
            status === 'expired'
              ? 'This password reset link has expired. Please request a new password reset link.'
              : 'This password reset link is invalid. Please request a new password reset link.',
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (status === 'success') {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <Ionicons name="checkmark-circle-outline" size={28} color="#4FD18B" />
            </View>
            <Text style={styles.title}>Password Reset Successful</Text>
            <Text style={styles.description}>Your password has been updated successfully. You can now sign in using your new password.</Text>

            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.9}>
              <Text style={styles.primaryText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandSection}>
          <View style={styles.logoMark}>
            <Image
              source={require('../../../assets/images/kitsphere-logo.png')}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.brand}>KitSphere</Text>
          <Text style={styles.brandSubtitle}>Secure password recovery</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.description}>Create a new password for your account and sign in with it next time.</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Reset Token</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#7C879A" />
              <TextInput
                value={token}
                onChangeText={(nextValue) => {
                  setToken(nextValue);
                  if (message) setMessage('');
                }}
                placeholder="Paste reset token"
                placeholderTextColor="#667085"
                autoCapitalize="none"
                style={styles.input}
                accessibilityLabel="Reset token"
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#7C879A" />
              <TextInput
                value={password}
                onChangeText={(nextValue) => {
                  setPassword(nextValue);
                  if (message) setMessage('');
                }}
                placeholder="New password"
                placeholderTextColor="#667085"
                secureTextEntry={!showPassword}
                style={styles.input}
                accessibilityLabel="New password"
              />
              <TouchableOpacity onPress={() => setShowPassword((current) => !current)} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#97A3B5" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Password must be at least 6 characters.</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#7C879A" />
              <TextInput
                value={confirmPassword}
                onChangeText={(nextValue) => {
                  setConfirmPassword(nextValue);
                  if (message) setMessage('');
                }}
                placeholder="Confirm password"
                placeholderTextColor="#667085"
                secureTextEntry={!showConfirmPassword}
                style={styles.input}
                accessibilityLabel="Confirm password"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((current) => !current)} accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#97A3B5" />
              </TouchableOpacity>
            </View>
          </View>

          {message ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} onPress={handleResetPassword} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Reset Password</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={17} color="#5FA8FF" />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
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
  fieldContainer: { marginBottom: 18 },
  label: { color: '#DDE3EC', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputContainer: { minHeight: 54, borderRadius: 15, backgroundColor: '#101722', borderWidth: 1, borderColor: '#263244', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  helperText: { color: '#96A7BA', fontSize: 12, marginTop: 6 },
  primaryButton: { minHeight: 52, borderRadius: 15, backgroundColor: '#1479E8', alignItems: 'center', justifyContent: 'center', marginTop: 6, flexDirection: 'row' },
  primaryButtonDisabled: { opacity: 0.75 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  backButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 18 },
  backText: { color: '#5FA8FF', fontSize: 13, fontWeight: '600' },
  errorBox: { backgroundColor: '#261515', borderWidth: 1, borderColor: '#5E2A2A', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: '#F4C7C7', fontSize: 13, lineHeight: 20 },
});
