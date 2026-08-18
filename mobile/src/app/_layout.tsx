import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { AnimatedSplashOverlay } from '../components/animated-icon';

function AppStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function getRouteParamsFromUrl(url: string): Record<string, string> {
  if (!url) {
    return {};
  }

  const delimiter = url.indexOf('?') > 0 ? '?' : '#';
  const [, queryString] = url.replace(/.*?:\/\//g, '').split(delimiter);
  const params: Record<string, string> = {};

  if (!queryString) {
    return params;
  }

  queryString.split('&').forEach((pair) => {
    const [key, value = ''] = pair.split('=');
    if (key) {
      params[key] = decodeURIComponent(value);
    }
  });

  return params;
}

export default function RootLayout() {
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (typeof url !== 'string' || !url) {
        return;
      }

      const params = getRouteParamsFromUrl(url);
      const normalizedUrl = url.replace(/.*?:\/\//g, '');

      if (normalizedUrl.includes('reset-password')) {
        router.replace({
          pathname: '/(auth)/reset-password',
          params,
        } as any);
      }
    };

    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const params = getRouteParamsFromUrl(initialUrl);
        const normalizedUrl = initialUrl.replace(/.*?:\/\//g, '');

        if (normalizedUrl.includes('reset-password')) {
          router.replace({
            pathname: '/(auth)/reset-password',
            params,
          } as any);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    void handleInitialUrl();

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider>
      <AppStatusBar />
      <AnimatedSplashOverlay />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: {
            backgroundColor: '#071822',
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </ThemeProvider>
  );
}