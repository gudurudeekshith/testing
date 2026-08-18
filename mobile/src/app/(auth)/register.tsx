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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleSelection, setRoleSelection] = useState<'student' | 'admin'>('student');

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    const cleanName = name.trim();
    const cleanSection = section.trim().toUpperCase();
    const cleanRollNumber = rollNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Basic validation
    if (
      !cleanName ||
      !cleanSection ||
      !cleanRollNumber ||
      !cleanEmail ||
      !cleanPhone ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Missing Information',
        'Please fill in all fields.',
      );
      return;
    }

    // KITSW email validation
    if (!/^[a-z0-9]+@kitsw\.ac\.in$/.test(cleanEmail)) {
      Alert.alert(
        'Invalid College Email',
        'Please use your official KITSW email address.',
      );
      return;
    }

    // Phone validation
    if (!/^\d{10}$/.test(cleanPhone)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid 10-digit phone number.',
      );
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert(
        'Invalid Password',
        'Password must contain at least 6 characters.',
      );
      return;
    }

    // Confirm password
    if (password !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'Password and confirm password do not match.',
      );
      return;
    }

    try {
      setLoading(true);

      console.log('[DEV] register request', {
        email: cleanEmail,
        selectedRole: roleSelection,
      });

      const response = await fetch(
        `${API_BASE_URL}/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: cleanName,
            section: cleanSection,
            email: cleanEmail,
            rollNumber: cleanRollNumber,
            phone: cleanPhone,
            password,
            role: roleSelection,
          }),
        },
      );

      console.log('[DEV] register response status', response.status);

      const data = await response.json();
      console.log('[DEV] register response payload', data);

      if (!response.ok || !data.success) {
        Alert.alert(
          'Registration Failed',
          data.message || 'Unable to create your account.',
        );
        return;
      }

      if (data.token) {
        await storeAuthSession(data.token, data.user || {});
      }

      router.replace('/(main)/home');
    } catch (error) {
      console.error('Register error:', error);

      Alert.alert(
        'Connection Error',
        'Unable to connect to the KitSphere server. Make sure the backend is running and your phone is connected to the same Wi-Fi network.',
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
        {/* Brand */}
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

        {/* Register Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>

          <Text style={styles.description}>
            Create your KitSphere account to access campus
            services.
          </Text>

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

          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#7C879A"
              />

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#667085"
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          {/* Section */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Section</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="school-outline"
                size={20}
                color="#7C879A"
              />

              <TextInput
                value={section}
                onChangeText={setSection}
                placeholder="Example: CSE-A"
                placeholderTextColor="#667085"
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          {/* Roll Number */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Roll Number</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="id-card-outline"
                size={20}
                color="#7C879A"
              />

              <TextInput
                value={rollNumber}
                onChangeText={setRollNumber}
                placeholder="Example: B24CS999"
                placeholderTextColor="#667085"
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          {/* College Email */}
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
                style={styles.input}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Phone Number</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="call-outline"
                size={20}
                color="#7C879A"
              />

              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit phone number"
                placeholderTextColor="#667085"
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.input}
              />
            </View>
          </View>

          {/* Password */}
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
                placeholder="Create a password"
                placeholderTextColor="#667085"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword((current) => !current)
                }
                activeOpacity={0.7}
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

          {/* Confirm Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Confirm Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#7C879A"
              />

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor="#667085"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowConfirmPassword((current) => !current)
                }
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={20}
                  color="#7C879A"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              loading && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text style={styles.registerButtonText}>
                  Create Account
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>

          {/* Login */}
          <View style={styles.loginRow}>
            <Text style={styles.loginQuestion}>
              Already have a KitSphere account?
            </Text>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color="#5AA9FF"
          />

          <Text style={styles.securityText}>
            Registration is restricted to official KITSW college
            accounts.
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

  registerButton: {
    minHeight: 56,
    borderRadius: 15,
    backgroundColor: '#1479E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },

  registerButtonDisabled: {
    opacity: 0.65,
  },

  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
    gap: 5,
  },

  loginQuestion: {
    color: '#7E899B',
    fontSize: 13,
  },

  loginLink: {
    color: '#5FA8FF',
    fontSize: 13,
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
});
