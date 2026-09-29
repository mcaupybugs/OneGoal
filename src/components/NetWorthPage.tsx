import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { NetWorthEntry, NetWorthFormMode, NetWorthSnapshot } from "../types";
import { RING_SIZE, RING_STROKE_WIDTH } from "../lib/constants";
import { ThemeColors, useTheme } from "../lib/theme";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  selectedCurrency: "INR" | "USD";
  entries: NetWorthEntry[];
  snapshot: NetWorthSnapshot;
  formMode: NetWorthFormMode;
  selectedEntry: NetWorthEntry | null;
  title: string;
  amount: string;
  displayMoney: (value: number) => string;
  setSelectedCurrency: (value: "INR" | "USD") => void;
  setTitle: (value: string) => void;
  setAmount: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onUpdateValue: (entry: NetWorthEntry) => void;
  onDelete: (id: string) => void;
};

export function NetWorthPage({
  selectedCurrency,
  entries,
  snapshot,
  formMode,
  selectedEntry,
  title,
  amount,
  displayMoney,
  setSelectedCurrency,
  setTitle,
  setAmount,
  onSubmit,
  onReset,
  onUpdateValue,
  onDelete,
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const radius = (RING_SIZE - RING_STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  let progressOffset = 0;

  const ringSegments = snapshot.sourceTotals
    .filter((item) => item.total > 0 && snapshot.total > 0)
    .map((item) => {
      const segmentLength = (item.total / snapshot.total) * circumference;
      const segment = {
        ...item,
        segmentLength,
        dashOffset: -progressOffset,
      };

      progressOffset += segmentLength;
      return segment;
    });

  return (
    <>
      <View style={[styles.card, styles.summaryCard]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>NET WORTH</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.currencyToggleButton}
              onPress={() => setSelectedCurrency(selectedCurrency === "INR" ? "USD" : "INR")}
            >
              <Text style={styles.currencyToggleText}>{selectedCurrency}</Text>
            </Pressable>
            <ThemeToggle />
          </View>
        </View>
        <Text style={styles.totalLabel}>Total Net Worth</Text>
        <Text style={styles.totalValue}>{displayMoney(snapshot.total)}</Text>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <G rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                stroke={colors.chartTrack}
                strokeWidth={RING_STROKE_WIDTH}
                fill="none"
              />
              {ringSegments.map((segment) => (
                <Circle
                  key={segment.id}
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={radius}
                  stroke={segment.color}
                  strokeWidth={RING_STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={`${segment.segmentLength} ${circumference}`}
                  strokeDashoffset={segment.dashOffset}
                />
              ))}
            </G>
          </Svg>
          <View style={styles.ringCenterLabel}>
            <Text style={styles.ringCenterTitle}>Assets</Text>
            <Text style={styles.ringCenterValue}>{entries.length}</Text>
          </View>
        </View>
        <View style={styles.legendList}>
          {snapshot.sourceTotals.map((item) => (
            <View key={item.id} style={styles.legendRow}>
              <View style={styles.legendLabelRow}>
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
              <View style={styles.legendValues}>
                <Text style={styles.legendAmount}>{displayMoney(item.total)}</Text>
                <Text style={styles.legendShare}>{snapshot.total > 0 ? `${Math.round((item.total / snapshot.total) * 100)}%` : "0%"}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, styles.formCard]}>
        <Text style={styles.sectionLabel}>{formMode === "create" ? "ADD SOURCE" : "UPDATE VALUE"}</Text>
        <Text style={styles.helperText}>
          {formMode === "create"
            ? "Track current values across any assets or sources you want."
            : "Update the latest value for this source."}
        </Text>
        {formMode === "create" ? (
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Source name, asset name, or account"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />
        ) : (
          <View style={styles.focusBox}>
            <Text style={styles.focusTitle}>{selectedEntry?.title ?? title}</Text>
            {selectedEntry ? <Text style={styles.focusText}>Current value: {displayMoney(selectedEntry.amount)}</Text> : null}
          </View>
        )}
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={formMode === "create" ? "Current value" : "Updated value"}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
        />
        <View style={styles.formActionRow}>
          <Pressable style={styles.secondaryButton} onPress={onReset}>
            <Text style={styles.secondaryButtonText}>{formMode === "create" ? "CLEAR" : "CANCEL"}</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onSubmit}>
            <Text style={styles.actionButtonText}>{formMode === "create" ? "SAVE SOURCE" : "SAVE VALUE"}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, styles.listCard]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>ASSET SOURCES</Text>
          <Text style={styles.sectionTotal}>{entries.length}</Text>
        </View>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No net worth sources yet.</Text>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryContent}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                <Text style={styles.entryAmount}>{displayMoney(entry.amount)}</Text>
                <View style={styles.entryActionRow}>
                  <Pressable style={styles.inlineActionButton} onPress={() => onUpdateValue(entry)}>
                    <Text style={styles.inlineActionButtonText}>UPDATE VALUE</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => onDelete(entry.id)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>X</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 5,
  },
  summaryCard: { gap: 14 },
  formCard: { gap: 12 },
  listCard: { gap: 12 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "900", letterSpacing: 1.3, color: colors.text },
  currencyToggleButton: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    backgroundColor: colors.strongSurface,
  },
  currencyToggleText: { color: colors.strongText, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  totalLabel: { fontSize: 13, fontWeight: "900", color: colors.subtleText, textTransform: "uppercase" },
  totalValue: { fontSize: 32, fontWeight: "900", color: colors.text },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenterLabel: { position: "absolute", alignItems: "center", justifyContent: "center" },
  ringCenterTitle: { fontSize: 12, fontWeight: "900", color: colors.subtleText, textTransform: "uppercase" },
  ringCenterValue: { marginTop: 4, fontSize: 28, fontWeight: "900", color: colors.text },
  legendList: { gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  legendLabelRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  legendSwatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: colors.border },
  legendText: { fontSize: 14, fontWeight: "900", color: colors.text, textTransform: "uppercase", flexShrink: 1 },
  legendValues: { alignItems: "flex-end" },
  legendAmount: { fontSize: 14, fontWeight: "900", color: colors.text },
  legendShare: { marginTop: 2, fontSize: 12, fontWeight: "700", color: colors.subtleText },
  helperText: { fontSize: 13, lineHeight: 18, fontWeight: "700", color: colors.mutedText },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.surface,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  focusBox: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.surfaceMuted,
    gap: 4,
  },
  focusTitle: { fontSize: 16, fontWeight: "900", color: colors.text, textTransform: "uppercase" },
  focusText: { fontSize: 14, fontWeight: "700", color: colors.mutedText },
  formActionRow: { flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.strongSurface,
  },
  actionButtonText: { color: colors.strongText, fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  secondaryButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  sectionTotal: { fontSize: 14, fontWeight: "900", color: colors.text },
  emptyText: { fontSize: 14, fontWeight: "700", color: colors.subtleText },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  entryContent: { flex: 1 },
  entryTitle: { fontSize: 15, fontWeight: "900", color: colors.text, textTransform: "uppercase" },
  entryAmount: { marginTop: 4, fontSize: 14, fontWeight: "700", color: colors.mutedText },
  entryActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  inlineActionButton: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  inlineActionButtonText: { color: colors.text, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  deleteText: { fontSize: 14, fontWeight: "900", color: colors.text },
});
