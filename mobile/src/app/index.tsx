import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { clearAuth, getAuthToken, hasValidAuthToken } from '../utils/auth';

export default function Index() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const token = await getAuthToken();

        if (!token) {
          if (isMounted) {
            setIsCheckingAuth(false);
            router.replace('/(auth)/login');
          }
          return;
        }

        if (!hasValidAuthToken(token)) {
          await clearAuth();

          if (isMounted) {
            setIsCheckingAuth(false);
            router.replace('/(auth)/login');
          }
          return;
        }

        if (isMounted) {
          setIsCheckingAuth(false);
          router.replace('/(main)/home');
        }
      } catch (error) {
        console.error('Auth bootstrap error:', error);

        try {
          await clearAuth();
        } catch (clearError) {
          console.error('Auth cleanup error:', clearError);
        }

        if (isMounted) {
          setIsCheckingAuth(false);
          router.replace('/(auth)/login');
        }
      }
    };

    void bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isCheckingAuth) {
    return null;
  }

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#5AA9FF" />
      <Text style={styles.loadingText}>Checking your session...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#071822',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#E5F0FF',
  },
});