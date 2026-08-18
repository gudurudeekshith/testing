import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  Appearance,
  ColorSchemeName,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkColors, lightColors } from './colors';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof darkColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

const THEME_KEY = 'kitsphere_theme_mode';

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();

  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);

      if (
        savedTheme === 'light' ||
        savedTheme === 'dark' ||
        savedTheme === 'system'
      ) {
        setModeState(savedTheme);
      }
    } catch (error) {
      console.error('Theme loading error:', error);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    try {
      setModeState(newMode);
      await AsyncStorage.setItem(THEME_KEY, newMode);
    } catch (error) {
      console.error('Theme saving error:', error);
    }
  };

  const isDark =
    mode === 'dark' ||
    (mode === 'system' && systemScheme !== 'light');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider',
    );
  }

  return context;
}
