import { Pressable, StyleSheet, Text, View } from "react-native";

import { SyncStatus } from "../types";
import { ThemeColors, useTheme } from "../lib/theme";

type Props = {
  configured: boolean;
  signedInEmail: string | null;
  syncStatus: SyncStatus;
  syncMessage: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
};

const getStatusLabel = (status: SyncStatus) => {
  switch (status) {
    case "syncing":
      return "SYNCING";
    case "synced":
      return "SYNCED";
    case "error":
      return "ERROR";
    default:
      return "LOCAL";
  }
};

export function AuthPanel({
  configured,
  signedInEmail,
  syncStatus,
  syncMessage,
  onSignIn,
  onSignOut,
  onSyncNow,
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>SYNC</Text>
        <View style={styles.statusChip}>
          <Text style={styles.statusChipText}>{getStatusLabel(syncStatus)}</Text>
        </View>
      </View>

      {!configured ? (
        <>
          <Text style={styles.title}>Optional cloud sign-in is not configured yet.</Text>
          <Text style={styles.helper}>
            Add your Supabase URL and publishable key to enable Google sign-in and secure cloud sync.
          </Text>
        </>
      ) : signedInEmail ? (
        <>
          <Text style={styles.title}>Signed in as {signedInEmail}</Text>
          <Text style={styles.helper}>{syncMessage}</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={onSyncNow}>
              <Text style={styles.secondaryButtonText}>SYNC NOW</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSignOut}>
              <Text style={styles.primaryButtonText}>SIGN OUT</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Use the app locally, or sign in with Google to sync.</Text>
          <Text style={styles.helper}>{syncMessage}</Text>
          <Pressable style={styles.primaryButton} onPress={onSignIn}>
            <Text style={styles.primaryButtonText}>SIGN IN WITH GOOGLE</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 3,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 0,
      elevation: 5,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 1.3,
      color: colors.text,
    },
    statusChip: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.strongSurface,
    },
    statusChipText: {
      color: colors.strongText,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 16,
      fontWeight: "900",
      color: colors.text,
    },
    helper: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      color: colors.mutedText,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    primaryButton: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      alignItems: "center",
      backgroundColor: colors.strongSurface,
      flex: 1,
    },
    primaryButtonText: {
      color: colors.strongText,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1,
    },
    secondaryButton: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      alignItems: "center",
      backgroundColor: colors.surface,
      flex: 1,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1,
    },
  });
