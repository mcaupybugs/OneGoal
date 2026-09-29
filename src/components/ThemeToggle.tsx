import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../lib/theme";

export function ThemeToggle() {
  const { darkMode, toggleDarkMode, colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: darkMode }}
      accessibilityLabel={darkMode ? "Turn light theme on" : "Turn dark theme on"}
      style={[
        styles.button,
        {
          backgroundColor: colors.strongSurface,
          borderColor: colors.border,
        },
      ]}
      onPress={toggleDarkMode}
    >
      <Text style={[styles.icon, { color: colors.strongText }]}>☾</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 34,
    borderWidth: 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 22,
  },
});
