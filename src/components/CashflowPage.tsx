import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CurrencyCode,
  IncomeCategory,
  IncomeEntry,
  IncomeFormMode,
  MonthRecord,
  MonthSnapshot,
  OutflowFormMode,
  SpendingEntry,
  ViewMode,
} from "../types";
import { getCategoryLabel, getIncomeHourlyRate, shiftMonth, toMonthLabel } from "../lib/cashflow";
import { ThemeColors, useTheme } from "../lib/theme";
import { PageTabs } from "./PageTabs";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  selectedMonth: string;
  selectedCurrency: CurrencyCode;
  activeView: ViewMode;
  activeRecord: MonthRecord;
  activeSnapshot: MonthSnapshot;
  incomeFormMode: IncomeFormMode;
  outflowFormMode: OutflowFormMode;
  selectedIncomeEntry: IncomeEntry | null;
  selectedSpendingEntry: SpendingEntry | null;
  incomeTitle: string;
  incomeAmount: string;
  incomeHoursPerDay: string;
  incomeCategory: IncomeCategory;
  spendingTitle: string;
  spendingAmount: string;
  displayMoney: (value: number) => string;
  displayHourly: (value: number) => string;
  setSelectedMonth: (value: string) => void;
  setSelectedCurrency: (value: CurrencyCode) => void;
  setActiveView: (value: ViewMode) => void;
  setIncomeTitle: (value: string) => void;
  setIncomeAmount: (value: string) => void;
  setIncomeHoursPerDay: (value: string) => void;
  setIncomeCategory: (value: IncomeCategory) => void;
  setSpendingTitle: (value: string) => void;
  setSpendingAmount: (value: string) => void;
  onSubmitIncome: () => void;
  onSubmitOutflow: () => void;
  onDeleteIncome: (id: string) => void;
  onDeleteOutflow: (id: string) => void;
  onOpenCreateIncome: () => void;
  onOpenCreateOutflow: () => void;
  onOpenAddIncomeMoney: (entry: IncomeEntry) => void;
  onOpenEditIncomeHours: (entry: IncomeEntry) => void;
  onOpenAddOutflowMoney: (entry: SpendingEntry) => void;
  onCancelIncomeForm: () => void;
  onCancelOutflowForm: () => void;
};

export function CashflowPage({
  selectedMonth,
  selectedCurrency,
  activeView,
  activeRecord,
  activeSnapshot,
  incomeFormMode,
  outflowFormMode,
  selectedIncomeEntry,
  selectedSpendingEntry,
  incomeTitle,
  incomeAmount,
  incomeHoursPerDay,
  incomeCategory,
  spendingTitle,
  spendingAmount,
  displayMoney,
  displayHourly,
  setSelectedMonth,
  setSelectedCurrency,
  setActiveView,
  setIncomeTitle,
  setIncomeAmount,
  setIncomeHoursPerDay,
  setIncomeCategory,
  setSpendingTitle,
  setSpendingAmount,
  onSubmitIncome,
  onSubmitOutflow,
  onDeleteIncome,
  onDeleteOutflow,
  onOpenCreateIncome,
  onOpenCreateOutflow,
  onOpenAddIncomeMoney,
  onOpenEditIncomeHours,
  onOpenAddOutflowMoney,
  onCancelIncomeForm,
  onCancelOutflowForm,
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <>
      <View style={[styles.card, styles.monthCard]}>
        <View style={styles.monthHeaderRow}>
          <Text style={styles.sectionLabel}>MONTH</Text>
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
        <View style={styles.monthRow}>
          <Pressable style={styles.navButton} onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
            <Text style={styles.navButtonText}>PREV</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{toMonthLabel(selectedMonth)}</Text>
          <Pressable style={styles.navButton} onPress={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>
            <Text style={styles.navButtonText}>NEXT</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, styles.tabCard]}>
        <PageTabs
          options={[
            { key: "dashboard", label: "DASHBOARD" },
            { key: "details", label: "DETAILS" },
          ]}
          activeKey={activeView === "dashboard" || activeView === "details" ? activeView : "dashboard"}
          onSelect={(value) => setActiveView(value)}
        />
        <PageTabs
          options={[
            { key: "income", label: "ADD INCOME" },
            { key: "outflow", label: "ADD OUTFLOW" },
          ]}
          activeKey={activeView === "income" || activeView === "outflow" ? activeView : "income"}
          onSelect={(value) => setActiveView(value)}
        />
      </View>

      {activeView === "dashboard" ? (
        <>
          <View style={styles.metricGrid}>
            <MetricCard colors={colors} label="Monthly Inflow" value={displayMoney(activeSnapshot.gross)} hint="All income sources combined" tilt="left" />
            <MetricCard colors={colors} label="Monthly Outflow" value={displayMoney(activeSnapshot.spending)} hint="What went out this month" tilt="right" />
            <MetricCard colors={colors} label="Combined Gross / hr" value={displayHourly(activeSnapshot.grossHourly)} hint="Before outflow is deducted" tilt="right" />
            <MetricCard colors={colors} label="Combined Net / hr" value={displayHourly(activeSnapshot.netHourly)} hint="After outflow is deducted" tilt="left" />
          </View>

          <View style={[styles.card, styles.progressCard]}>
            <Text style={styles.sectionLabel}>BREAKDOWN</Text>
            <View style={styles.scoreRow}>
              <ScoreItem colors={colors} label="Salary" value={displayMoney(activeSnapshot.salaryIncome)} />
              <ScoreItem colors={colors} label="Side Business" value={displayMoney(activeSnapshot.sideBusinessIncome)} />
              <ScoreItem colors={colors} label="Net" value={displayMoney(activeSnapshot.net)} />
              <ScoreItem colors={colors} label="Tracked Hours" value={`${activeSnapshot.trackedHours.toFixed(1)} hr`} />
            </View>
            <Text style={styles.helperText}>
              Combined hourly income uses each source&apos;s monthly amount divided by hours per day times the
              number of days in this month.
            </Text>
          </View>

          <View style={[styles.card, styles.quickActionCard]}>
            <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
            <View style={styles.quickActionRow}>
              <Pressable style={styles.actionButton} onPress={onOpenCreateIncome}>
                <Text style={styles.actionButtonText}>ADD INCOME</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={onOpenCreateOutflow}>
                <Text style={styles.actionButtonText}>ADD OUTFLOW</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {activeView === "income" ? (
        <View style={[styles.card, styles.formCard]}>
          <Text style={styles.sectionLabel}>
            {incomeFormMode === "create"
              ? "ADD MONTHLY INFLOW"
              : incomeFormMode === "addMoney"
                ? "ADD MORE MONEY"
                : "EDIT SOURCE HOURS"}
          </Text>
          <Text style={styles.helperText}>
            {incomeFormMode === "create"
              ? "Add each job or business separately so each one gets its own hourly rate."
              : incomeFormMode === "addMoney"
                ? "Increase the monthly amount for this source without creating a duplicate entry."
                : "Update the daily hours for this source and its hourly income will recalculate."}
          </Text>

          {incomeFormMode === "create" ? (
            <>
              <View style={styles.categoryRow}>
                <CategoryButton colors={colors} label="SALARY" active={incomeCategory === "salary"} onPress={() => setIncomeCategory("salary")} />
                <CategoryButton
                  colors={colors}
                  label="SIDE BUSINESS"
                  active={incomeCategory === "sideBusiness"}
                  onPress={() => setIncomeCategory("sideBusiness")}
                />
              </View>

              <TextInput
                value={incomeTitle}
                onChangeText={setIncomeTitle}
                placeholder="Source name"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
              />
              <TextInput
                value={incomeAmount}
                onChangeText={setIncomeAmount}
                keyboardType="decimal-pad"
                placeholder="Monthly inflow amount"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
              />
              <TextInput
                value={incomeHoursPerDay}
                onChangeText={setIncomeHoursPerDay}
                keyboardType="number-pad"
                placeholder="Hours worked per day for this source"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
              />
            </>
          ) : (
            <>
              <FocusBox colors={colors} title={selectedIncomeEntry?.title ?? incomeTitle} meta={getCategoryLabel(selectedIncomeEntry?.category ?? incomeCategory)}>
                {selectedIncomeEntry ? (
                  <>
                    <Text style={styles.focusText}>Current amount: {displayMoney(selectedIncomeEntry.amount)}</Text>
                    <Text style={styles.focusText}>Current hours / day: {selectedIncomeEntry.hoursPerDay}</Text>
                  </>
                ) : null}
              </FocusBox>

              {incomeFormMode === "addMoney" ? (
                <TextInput
                  value={incomeAmount}
                  onChangeText={setIncomeAmount}
                  keyboardType="decimal-pad"
                  placeholder="Additional amount to add"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              ) : (
                <TextInput
                  value={incomeHoursPerDay}
                  onChangeText={setIncomeHoursPerDay}
                  keyboardType="number-pad"
                  placeholder="New hours worked per day"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              )}
            </>
          )}

          <View style={styles.formActionRow}>
            <Pressable style={styles.secondaryButton} onPress={onCancelIncomeForm}>
              <Text style={styles.secondaryButtonText}>CANCEL</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onSubmitIncome}>
              <Text style={styles.actionButtonText}>
                {incomeFormMode === "create" ? "SAVE INCOME" : incomeFormMode === "addMoney" ? "ADD MONEY" : "SAVE HOURS"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeView === "outflow" ? (
        <View style={[styles.card, styles.formCard]}>
          <Text style={styles.sectionLabel}>
            {outflowFormMode === "create" ? "ADD MONTHLY OUTFLOW" : "ADD MORE OUTFLOW"}
          </Text>
          <Text style={styles.helperText}>
            {outflowFormMode === "create"
              ? "Keep this simple. Add each monthly expense manually."
              : "Increase the amount on this existing outflow without creating a duplicate entry."}
          </Text>

          {outflowFormMode === "create" ? (
            <TextInput
              value={spendingTitle}
              onChangeText={setSpendingTitle}
              placeholder="Outflow label"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          ) : (
            <FocusBox colors={colors} title={selectedSpendingEntry?.title ?? spendingTitle}>
              {selectedSpendingEntry ? (
                <Text style={styles.focusText}>Current amount: {displayMoney(selectedSpendingEntry.amount)}</Text>
              ) : null}
            </FocusBox>
          )}

          <TextInput
            value={spendingAmount}
            onChangeText={setSpendingAmount}
            keyboardType="decimal-pad"
            placeholder={outflowFormMode === "create" ? "Monthly outflow amount" : "Additional amount to add"}
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />

          <View style={styles.formActionRow}>
            <Pressable style={styles.secondaryButton} onPress={onCancelOutflowForm}>
              <Text style={styles.secondaryButtonText}>CANCEL</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onSubmitOutflow}>
              <Text style={styles.actionButtonText}>{outflowFormMode === "create" ? "SAVE OUTFLOW" : "ADD MONEY"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeView === "details" ? (
        <>
          <View style={[styles.card, styles.listCard]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>INCOME DETAILS</Text>
              <Text style={styles.sectionTotal}>{displayMoney(activeSnapshot.gross)}</Text>
            </View>
            {activeRecord.incomeEntries.length === 0 ? (
              <Text style={styles.emptyText}>No income sources yet for this month.</Text>
            ) : (
              activeRecord.incomeEntries.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryContent}>
                    <Text style={styles.entryTitle}>{entry.title}</Text>
                    <Text style={styles.entryMeta}>{getCategoryLabel(entry.category)}</Text>
                    <Text style={styles.entryAmount}>Monthly: {displayMoney(entry.amount)}</Text>
                    <Text style={styles.entryAmount}>Hours / day: {entry.hoursPerDay}</Text>
                    <Text style={styles.entryAmount}>Hourly: {displayHourly(getIncomeHourlyRate(entry, selectedMonth))}</Text>
                    <View style={styles.entryActionRow}>
                      <InlineAction colors={colors} label="ADD MONEY" onPress={() => onOpenAddIncomeMoney(entry)} />
                      <InlineAction colors={colors} label="EDIT HOURS" onPress={() => onOpenEditIncomeHours(entry)} />
                    </View>
                  </View>
                  <DeleteButton colors={colors} onPress={() => onDeleteIncome(entry.id)} />
                </View>
              ))
            )}
          </View>

          <View style={[styles.card, styles.listCard]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>OUTFLOW DETAILS</Text>
              <Text style={styles.sectionTotal}>{displayMoney(activeSnapshot.spending)}</Text>
            </View>
            {activeRecord.spendingEntries.length === 0 ? (
              <Text style={styles.emptyText}>No outflow entries yet for this month.</Text>
            ) : (
              activeRecord.spendingEntries.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryContent}>
                    <Text style={styles.entryTitle}>{entry.title}</Text>
                    <Text style={styles.entryAmount}>{displayMoney(entry.amount)}</Text>
                    <View style={styles.entryActionRow}>
                      <InlineAction colors={colors} label="ADD MONEY" onPress={() => onOpenAddOutflowMoney(entry)} />
                    </View>
                  </View>
                  <DeleteButton colors={colors} onPress={() => onDeleteOutflow(entry.id)} />
                </View>
              ))
            )}
          </View>
        </>
      ) : null}
    </>
  );
}

function MetricCard({
  colors,
  label,
  value,
  hint,
  tilt,
}: {
  colors: ThemeColors;
  label: string;
  value: string;
  hint: string;
  tilt: "left" | "right";
}) {
  const styles = createStyles(colors);

  return (
    <View style={[styles.card, styles.metricCard, tilt === "left" ? styles.tiltLeft : styles.tiltRight]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

function ScoreItem({ colors, label, value }: { colors: ThemeColors; label: string; value: string }) {
  const styles = createStyles(colors);

  return (
    <View style={styles.scoreItem}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function CategoryButton({
  colors,
  label,
  active,
  onPress,
}: {
  colors: ThemeColors;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = createStyles(colors);

  return (
    <Pressable style={[styles.categoryButton, active && styles.categoryButtonActive]} onPress={onPress}>
      <Text style={[styles.categoryButtonText, active && styles.categoryButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FocusBox({ colors, title, meta, children }: { colors: ThemeColors; title: string; meta?: string; children?: ReactNode }) {
  const styles = createStyles(colors);

  return (
    <View style={styles.focusBox}>
      <Text style={styles.focusTitle}>{title}</Text>
      {meta ? <Text style={styles.focusMeta}>{meta}</Text> : null}
      {children}
    </View>
  );
}

function InlineAction({ colors, label, onPress }: { colors: ThemeColors; label: string; onPress: () => void }) {
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.inlineActionButton} onPress={onPress}>
      <Text style={styles.inlineActionButtonText}>{label}</Text>
    </Pressable>
  );
}

function DeleteButton({ colors, onPress }: { colors: ThemeColors; onPress: () => void }) {
  const styles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={styles.deleteButton}>
      <Text style={styles.deleteText}>X</Text>
    </Pressable>
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
  monthCard: { gap: 12 },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.3,
    color: colors.text,
  },
  currencyToggleButton: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    backgroundColor: colors.strongSurface,
  },
  currencyToggleText: {
    color: colors.strongText,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
    textTransform: "uppercase",
  },
  navButton: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.strongSurface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 68,
    alignItems: "center",
  },
  navButtonText: {
    color: colors.strongText,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  tabCard: { gap: 10 },
  metricGrid: { gap: 14 },
  metricCard: { minHeight: 118, justifyContent: "space-between" },
  tiltLeft: { transform: [{ rotate: "-1deg" }] },
  tiltRight: { transform: [{ rotate: "1deg" }] },
  metricLabel: { fontSize: 15, fontWeight: "900", textTransform: "uppercase", color: colors.text },
  metricValue: { fontSize: 26, fontWeight: "900", color: colors.text },
  metricHint: { fontSize: 13, lineHeight: 18, fontWeight: "700", color: colors.mutedText },
  progressCard: { gap: 14 },
  scoreRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  scoreItem: {
    flexGrow: 1,
    minWidth: 120,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
  },
  scoreLabel: { fontSize: 12, fontWeight: "900", color: colors.text, textTransform: "uppercase" },
  scoreValue: { marginTop: 4, fontSize: 17, fontWeight: "900", color: colors.text },
  quickActionCard: { gap: 12 },
  quickActionRow: { flexDirection: "row", gap: 10 },
  formCard: { gap: 12 },
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
  categoryRow: { flexDirection: "row", gap: 10 },
  categoryButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  categoryButtonActive: { backgroundColor: colors.strongSurface },
  categoryButtonText: { color: colors.text, fontSize: 12, fontWeight: "900" },
  categoryButtonTextActive: { color: colors.strongText },
  focusBox: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.surfaceMuted,
    gap: 4,
  },
  focusTitle: { fontSize: 16, fontWeight: "900", color: colors.text, textTransform: "uppercase" },
  focusMeta: { fontSize: 12, fontWeight: "900", color: colors.subtleText, textTransform: "uppercase" },
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
  listCard: { gap: 12 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
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
  entryMeta: { marginTop: 3, fontSize: 12, fontWeight: "900", color: colors.subtleText, textTransform: "uppercase" },
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
