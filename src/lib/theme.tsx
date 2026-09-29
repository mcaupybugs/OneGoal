import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

const THEME_PREFERENCE_KEY = "one-goal-dark-theme";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  mutedText: string;
  subtleText: string;
  strongSurface: string;
  strongText: string;
  placeholder: string;
  chartTrack: string;
  shadow: string;
};

type ThemeContextValue = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  colors: ThemeColors;
};

const lightColors: ThemeColors = {
  background: "#f4f4f4",
  surface: "#ffffff",
  surfaceMuted: "#f7f7f7",
  border: "#111111",
  text: "#111111",
  mutedText: "#404040",
  subtleText: "#575757",
  strongSurface: "#111111",
  strongText: "#ffffff",
  placeholder: "#7a7a7a",
  chartTrack: "#d8d8d8",
  shadow: "#000000",
};

const darkColors: ThemeColors = {
  background: "#121318",
  surface: "#202127",
  surfaceMuted: "#2a2c33",
  border: "#e5e6eb",
  text: "#f5f5f7",
  mutedText: "#c2c3cb",
  subtleText: "#a4a6b0",
  strongSurface: "#f5f5f7",
  strongText: "#17181d",
  placeholder: "#a4a6b0",
  chartTrack: "#454750",
  shadow: "#000000",
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((value) => setDarkMode(value === "true"))
      .catch(() => Alert.alert("Theme error", "Could not load your saved theme preference."))
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    AsyncStorage.setItem(THEME_PREFERENCE_KEY, String(darkMode)).catch(() => {
      Alert.alert("Theme error", "Could not save your theme preference.");
    });
  }, [darkMode, isLoaded]);

  const value = useMemo(
    () => ({
      darkMode,
      toggleDarkMode: () => setDarkMode((current) => !current),
      colors: darkMode ? darkColors : lightColors,
    }),
    [darkMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return theme;
}
