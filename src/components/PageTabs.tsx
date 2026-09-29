import { Pressable, StyleSheet, Text, View } from "react-native";
import { ThemeColors, useTheme } from "../lib/theme";

type TabOption<T extends string> = {
  key: T;
  label: string;
};

type Props<T extends string> = {
  options: TabOption<T>[];
  activeKey: T;
  onSelect: (key: T) => void;
};

export function PageTabs<T extends string>({ options, activeKey, onSelect }: Props<T>) {
  const { colors } = useTheme();
  const themedStyles = createStyles(colors);

  return (
    <View style={themedStyles.row}>
      {options.map((option) => {
        const isActive = option.key === activeKey;

        return (
          <Pressable
            key={option.key}
            style={[themedStyles.button, isActive && themedStyles.buttonActive]}
            onPress={() => onSelect(option.key)}
          >
            <Text style={[themedStyles.text, isActive && themedStyles.textActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 10,
    },
    button: {
      flex: 1,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    buttonActive: {
      backgroundColor: colors.strongSurface,
    },
    text: {
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.8,
      color: colors.text,
    },
    textActive: {
      color: colors.strongText,
    },
  });
