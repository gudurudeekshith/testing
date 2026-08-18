import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Link, router } from 'expo-router';
import { API_BASE_URL } from '../../services/api';
import { storeAuthSession } from '../../utils/auth';
import Constants from 'expo-constants';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleSelection, setRoleSelection] = useState<'student' | 'admin'>('student');

  // Google sign-in is disabled in this build to avoid bundler resolution issues.
  // The UI still shows a Google button; enable the feature by restoring
  // the expo-auth-session provider imports and configuration when ready.

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert(
        'Missing Information',
        'Please enter your college email and password.',
      );
      return;
    }

    if (!normalizedEmail.endsWith('@kitsw.ac.in')) {
      Alert.alert(
        'Invalid Email',
        'Please use your official KITSW college email.',
      );
      return;
    }

    try {
      setLoading(true);

      console.log('[DEV] login request', {
        email: normalizedEmail,
        selectedRole: roleSelection,
      });

      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        },
      );

      console.log('[DEV] login response status', response.status);

      const data = await response.json();
      console.log('[DEV] login response payload', data);

      if (!response.ok || !data.success) {
        Alert.alert(
          'Login Failed',
          data.message || 'Unable to login. Please try again.',
        );
        return;
      }

      if (!data.token) {
        Alert.alert(
          'Login Error',
          'Authentication token was not received from the server.',
        );
        return;
      }

      if (!data.user || !data.user.role) {
        Alert.alert(
          'Access Denied',
          'User role could not be verified.',
        );
        return;
      }

      const returnedRole = data.user.role;
      console.log('[DEV] returned user role', returnedRole, 'selected role', roleSelection);

      if (roleSelection === 'student' && returnedRole !== 'student') {
        Alert.alert(
          'Access denied.',
          `This account is registered as ${returnedRole === 'admin' ? 'Admin' : 'Student'}. Please select ${returnedRole === 'admin' ? 'Admin' : 'Student'}.`,
        );
        return;
      }

      if (roleSelection === 'admin' && returnedRole !== 'admin') {
        Alert.alert(
          'Access denied.',
          `This account is registered as ${returnedRole === 'student' ? 'Student' : 'Admin'}. Please select ${returnedRole === 'student' ? 'Student' : 'Admin'}.`,
        );
        return;
      }

      await storeAuthSession(data.token, data.user || {});
      router.replace('/(main)/home');
    } catch (error) {
      console.error('Login request error:', error);

      Alert.alert(
        'Connection Error',
        'Unable to connect to the KitSphere server. Make sure the backend is running and your phone is connected to the same Wi-Fi network as your computer.',
      );
    } finally {
      setLoading(false);
    }
  };

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

          <Text style={styles.brandSubtitle}>
            Your campus, connected.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>

          <Text style={styles.description}>
            Sign in with your KitSphere account to continue.
          </Text>

          {/* Role selector tab row */}
          <View style={styles.roleTabsContainer}>
            <TouchableOpacity
              style={[
                styles.roleTabButton,
                roleSelection === 'student' && styles.roleTabButtonActive,
              ]}
              onPress={() => setRoleSelection('student')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleTabText,
                  roleSelection === 'student' && styles.roleTabTextActive,
                ]}
              >
                Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleTabButton,
                roleSelection === 'admin' && styles.roleTabButtonActive,
              ]}
              onPress={() => setRoleSelection('admin')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleTabText,
                  roleSelection === 'admin' && styles.roleTabTextActive,
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>College Email</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#7C879A"
              />

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="yourname@kitsw.ac.in"
                placeholderTextColor="#667085"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#7C879A"
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#667085"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword((value) => !value)
                }
                activeOpacity={0.7}
                disabled={loading}
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={20}
                  color="#7C879A"
                />
              </TouchableOpacity>
            </View>
          </View>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity
              style={styles.forgotButton}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.forgotText}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            style={[
              styles.loginButton,
              loading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.loginButtonText}>
                  Signing in...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.loginButtonText}>
                  Login
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.googleButton, loading && styles.loginButtonDisabled]}
            onPress={() => {
              Alert.alert('Coming Soon', 'Google sign-in will be available soon.');
            }}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={18} color="#000" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerQuestion}>
              Don't have a KitSphere account?
            </Text>

            <Link href="/(auth)/register" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.registerLink}>
                  Register
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <View style={styles.securityRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color="#5AA9FF"
          />

          <Text style={styles.securityText}>
            Student access is restricted to the official KITSW
            college account.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05070B',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 30,
    justifyContent: 'center',
  },

  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },

  logoMark: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#102840',
    borderWidth: 1,
    borderColor: '#24517A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  logoImage: {
    width: 46,
    height: 46,
    resizeMode: 'contain',
  },

  brand: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  brandSubtitle: {
    color: '#7E899B',
    fontSize: 14,
    marginTop: 6,
  },

  card: {
    backgroundColor: '#0B111A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#202B3A',
    padding: 22,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },

  description: {
    color: '#8E99AA',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    marginBottom: 25,
  },

  fieldContainer: {
    marginBottom: 18,
  },

  label: {
    color: '#DDE3EC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 56,
    borderRadius: 15,
    backgroundColor: '#101722',
    borderWidth: 1,
    borderColor: '#263244',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -5,
    marginBottom: 20,
  },

  forgotText: {
    color: '#5FA8FF',
    fontSize: 14,
    fontWeight: '600',
  },

  loginButton: {
    minHeight: 56,
    borderRadius: 15,
    backgroundColor: '#1479E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
    gap: 5,
  },

  registerQuestion: {
    color: '#7E899B',
    fontSize: 13,
  },

  registerLink: {
    color: '#5FA8FF',
    fontSize: 13,
    fontWeight: '700',
  },

  googleButton: {
    marginTop: 12,
    minHeight: 56,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 20,
    paddingHorizontal: 8,
  },

  securityText: {
    flex: 1,
    color: '#687386',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },

  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#101722',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#263244',
    padding: 4,
    marginBottom: 20,
  },
  roleTabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTabButtonActive: {
    backgroundColor: '#1479E8',
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C879A',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

