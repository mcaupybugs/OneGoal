import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AuthPanel } from "./src/components/AuthPanel";
import { CashflowPage } from "./src/components/CashflowPage";
import { NetWorthPage } from "./src/components/NetWorthPage";
import { PageTabs } from "./src/components/PageTabs";
import {
  currentMonthKey,
  createMonthRecord,
  getMonthSnapshot,
  isMonthRecordEmpty,
  normalizeRecords,
} from "./src/lib/cashflow";
import { resolveCloudData, fetchRemoteAppData, pushRemoteAppData } from "./src/lib/cloudSync";
import {
  formatEditableAmount,
  formatHourlyForCurrency,
  formatMoneyForCurrency,
  fromBaseCurrency,
  parseCurrencyInput,
  sanitizeDigitsInput,
  sanitizeMoneyInput,
  toBaseCurrency,
} from "./src/lib/currency";
import { createEmptyAppData, loadLocalAppData, saveLocalAppData } from "./src/lib/localData";
import { getNetWorthSnapshot } from "./src/lib/netWorth";
import { nowIso, buildId } from "./src/lib/shared";
import { ThemeProvider, useTheme } from "./src/lib/theme";
import {
  createSessionFromUrl,
  isSupabaseConfigured,
  signInWithGoogle,
  signOutOfSupabase,
  supabase,
} from "./src/lib/supabase";
import {
  AppData,
  AppPage,
  CurrencyCode,
  IncomeCategory,
  IncomeFormMode,
  IncomeEntry,
  NetWorthEntry,
  NetWorthFormMode,
  OutflowFormMode,
  SpendingEntry,
  SyncStatus,
  ViewMode,
} from "./src/types";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { darkMode, colors } = useTheme();
  const [appData, setAppData] = useState<AppData>(createEmptyAppData());
  const [isHydrated, setIsHydrated] = useState(false);
  const [activePage, setActivePage] = useState<AppPage>("cashflow");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [activeView, setActiveView] = useState<ViewMode>("dashboard");

  const [incomeFormMode, setIncomeFormMode] = useState<IncomeFormMode>("create");
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);
  const [outflowFormMode, setOutflowFormMode] = useState<OutflowFormMode>("create");
  const [selectedSpendingId, setSelectedSpendingId] = useState<string | null>(null);
  const [netWorthFormMode, setNetWorthFormMode] = useState<NetWorthFormMode>("create");
  const [selectedNetWorthId, setSelectedNetWorthId] = useState<string | null>(null);

  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeHoursPerDay, setIncomeHoursPerDay] = useState("");
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>("salary");

  const [spendingTitle, setSpendingTitle] = useState("");
  const [spendingAmount, setSpendingAmount] = useState("");

  const [netWorthTitle, setNetWorthTitle] = useState("");
  const [netWorthAmount, setNetWorthAmount] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local-only");
  const [syncMessage, setSyncMessage] = useState("Working locally on this device.");

  const hasCompletedInitialCloudSyncRef = useRef(false);
  const skipNextAutoUploadRef = useRef<string | null>(null);
  const previousCurrencyRef = useRef<CurrencyCode>(createEmptyAppData().selectedCurrency);

  const incomingUrl = Linking.useURL();

  const selectedCurrency = appData.selectedCurrency;
  const activeRecord = appData.records[selectedMonth] ?? createMonthRecord();
  const activeSnapshot = getMonthSnapshot(activeRecord, selectedMonth);
  const netWorthSnapshot = getNetWorthSnapshot(appData.netWorthEntries);

  const selectedIncomeEntry = activeRecord.incomeEntries.find((entry) => entry.id === selectedIncomeId) ?? null;
  const selectedSpendingEntry = activeRecord.spendingEntries.find((entry) => entry.id === selectedSpendingId) ?? null;
  const selectedNetWorthEntry = appData.netWorthEntries.find((entry) => entry.id === selectedNetWorthId) ?? null;

  const displayMoney = (value: number) => formatMoneyForCurrency(value, selectedCurrency);
  const displayHourly = (value: number) => formatHourlyForCurrency(value, selectedCurrency);

  const updateAppData = (updater: (current: AppData) => AppData) => {
    setAppData((current) => ({
      ...updater(current),
      updatedAt: nowIso(),
    }));
  };

  const performCloudSync = async (mode: "initial" | "manual" | "auto") => {
    if (!supabase || !session) {
      return;
    }

    if (mode !== "auto") {
      setSyncStatus("syncing");
      setSyncMessage(mode === "manual" ? "Syncing with Supabase now." : "Syncing local data with Supabase.");
    }

    const remoteData = await fetchRemoteAppData(session.user.id);
    const resolution = resolveCloudData(appData, remoteData);

    if (resolution.action === "download") {
      skipNextAutoUploadRef.current = resolution.data.updatedAt;
      setAppData(resolution.data);
      setSyncStatus("synced");
      setSyncMessage("Cloud data loaded onto this device.");
      return;
    }

    if (resolution.action === "upload" || mode === "manual" || mode === "auto") {
      await pushRemoteAppData(session.user.id, appData);
      setSyncStatus("synced");
      setSyncMessage(mode === "manual" ? "Local data pushed to Supabase." : "Local and cloud data are in sync.");
      return;
    }

    setSyncStatus("synced");
    setSyncMessage("Local and cloud data are already in sync.");
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const localData = await loadLocalAppData();

        if (!isMounted) {
          return;
        }

        setAppData(localData);

        if (supabase) {
          const { data } = await supabase.auth.getSession();

          if (!isMounted) {
            return;
          }

          setSession(data.session ?? null);
        }
      } catch {
        Alert.alert("Storage error", "Could not load your saved data.");
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    load();

    let subscription: { unsubscribe: () => void } | null = null;

    if (supabase) {
      subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      }).data.subscription;
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveLocalAppData(appData).catch(() => {
      Alert.alert("Save error", "Could not save your latest changes locally.");
    });
  }, [appData, isHydrated]);

  useEffect(() => {
    if (!incomingUrl) {
      return;
    }

    createSessionFromUrl(incomingUrl).catch(() => {
      Alert.alert("Sign-in error", "Could not finish the Supabase sign-in redirect.");
    });
  }, [incomingUrl]);

  useEffect(() => {
    const previousCurrency = previousCurrencyRef.current;

    if (previousCurrency === selectedCurrency) {
      return;
    }

    const convertInputAmount = (value: string) => {
      if (value.trim() === "") {
        return "";
      }

      const parsed = parseCurrencyInput(value);

      if (!Number.isFinite(parsed)) {
        return value;
      }

      const baseValue = toBaseCurrency(parsed, previousCurrency);
      return formatEditableAmount(fromBaseCurrency(baseValue, selectedCurrency));
    };

    setIncomeAmount((current) => convertInputAmount(current));
    setSpendingAmount((current) => convertInputAmount(current));
    setNetWorthAmount((current) => convertInputAmount(current));
    previousCurrencyRef.current = selectedCurrency;
  }, [selectedCurrency]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isSupabaseConfigured) {
      setSyncStatus("local-only");
      setSyncMessage("Working locally. Add Supabase credentials to enable Google sync.");
      return;
    }

    if (!session) {
      hasCompletedInitialCloudSyncRef.current = false;
      setSyncStatus("local-only");
      setSyncMessage("Working locally on this device. Sign in with Google to sync.");
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        await performCloudSync("initial");

        if (!cancelled) {
          hasCompletedInitialCloudSyncRef.current = true;
        }
      } catch {
        if (!cancelled) {
          setSyncStatus("error");
          setSyncMessage("Cloud sync failed. Local data is still safe on this device.");
        }
      }
    };

    sync();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, session?.user.id]);

  useEffect(() => {
    if (!isHydrated || !supabase || !session || !hasCompletedInitialCloudSyncRef.current) {
      return;
    }

    if (skipNextAutoUploadRef.current === appData.updatedAt) {
      skipNextAutoUploadRef.current = null;
      return;
    }

    const timeout = setTimeout(() => {
      performCloudSync("auto").catch(() => {
        setSyncStatus("error");
        setSyncMessage("Automatic cloud sync failed. Local data is still safe on this device.");
      });
    }, 800);

    return () => clearTimeout(timeout);
  }, [appData.updatedAt, isHydrated, session?.user.id]);

  const setSelectedCurrency = (currency: CurrencyCode) => {
    updateAppData((current) => ({
      ...current,
      selectedCurrency: currency,
    }));
  };

  const updateMonthRecord = (updater: (record: typeof activeRecord) => typeof activeRecord) => {
    updateAppData((current) => ({
      ...current,
      records: {
        ...current.records,
        [selectedMonth]: updater(current.records[selectedMonth] ?? createMonthRecord()),
      },
    }));
  };

  const resetIncomeForm = () => {
    setIncomeFormMode("create");
    setSelectedIncomeId(null);
    setIncomeTitle("");
    setIncomeAmount("");
    setIncomeHoursPerDay("");
    setIncomeCategory("salary");
  };

  const resetOutflowForm = () => {
    setOutflowFormMode("create");
    setSelectedSpendingId(null);
    setSpendingTitle("");
    setSpendingAmount("");
  };

  const resetNetWorthForm = () => {
    setNetWorthFormMode("create");
    setSelectedNetWorthId(null);
    setNetWorthTitle("");
    setNetWorthAmount("");
  };

  const openCreateIncome = () => {
    resetIncomeForm();
    setActiveView("income");
  };

  const openCreateOutflow = () => {
    resetOutflowForm();
    setActiveView("outflow");
  };

  const openAddIncomeMoney = (entry: IncomeEntry) => {
    setIncomeFormMode("addMoney");
    setSelectedIncomeId(entry.id);
    setIncomeTitle(entry.title);
    setIncomeAmount("");
    setIncomeHoursPerDay(String(entry.hoursPerDay));
    setIncomeCategory(entry.category);
    setActiveView("income");
  };

  const openEditIncomeHours = (entry: IncomeEntry) => {
    setIncomeFormMode("editHours");
    setSelectedIncomeId(entry.id);
    setIncomeTitle(entry.title);
    setIncomeAmount("");
    setIncomeHoursPerDay(String(entry.hoursPerDay));
    setIncomeCategory(entry.category);
    setActiveView("income");
  };

  const openAddOutflowMoney = (entry: SpendingEntry) => {
    setOutflowFormMode("addMoney");
    setSelectedSpendingId(entry.id);
    setSpendingTitle(entry.title);
    setSpendingAmount("");
    setActiveView("outflow");
  };

  const openUpdateNetWorthValue = (entry: NetWorthEntry) => {
    setNetWorthFormMode("updateValue");
    setSelectedNetWorthId(entry.id);
    setNetWorthTitle(entry.title);
    setNetWorthAmount(formatEditableAmount(fromBaseCurrency(entry.amount, selectedCurrency)));
  };

  const submitIncome = () => {
    if (incomeFormMode !== "create" && !selectedIncomeEntry) {
      Alert.alert("Missing source", "That income source could not be found.");
      resetIncomeForm();
      return;
    }

    if (incomeFormMode === "addMoney") {
      const targetEntry = selectedIncomeEntry;

      if (!targetEntry) {
        Alert.alert("Missing source", "That income source could not be found.");
        return;
      }

      const displayAmount = parseCurrencyInput(incomeAmount);

      if (!Number.isFinite(displayAmount) || displayAmount <= 0) {
        Alert.alert("Invalid amount", "Enter an amount greater than zero to add to this source.");
        return;
      }

      const baseAmount = toBaseCurrency(displayAmount, selectedCurrency);

      updateMonthRecord((record) => ({
        ...record,
        incomeEntries: record.incomeEntries.map((entry) =>
          entry.id === targetEntry.id ? { ...entry, amount: entry.amount + baseAmount } : entry,
        ),
      }));

      resetIncomeForm();
      setActiveView("details");
      return;
    }

    if (incomeFormMode === "editHours") {
      const targetEntry = selectedIncomeEntry;

      if (!targetEntry) {
        Alert.alert("Missing source", "That income source could not be found.");
        return;
      }

      const hoursPerDay = Number(incomeHoursPerDay);

      if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
        Alert.alert("Invalid hours", "Enter the number of hours you work per day for this source.");
        return;
      }

      updateMonthRecord((record) => ({
        ...record,
        incomeEntries: record.incomeEntries.map((entry) =>
          entry.id === targetEntry.id ? { ...entry, hoursPerDay } : entry,
        ),
      }));

      resetIncomeForm();
      setActiveView("details");
      return;
    }

    const title = incomeTitle.trim();
    const amount = parseCurrencyInput(incomeAmount);
    const hoursPerDay = Number(incomeHoursPerDay);

    if (!title) {
      Alert.alert("Missing title", "Add the income source name.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a monthly inflow amount greater than zero.");
      return;
    }

    if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
      Alert.alert("Invalid hours", "Enter the number of hours you work per day for this source.");
      return;
    }

    const baseAmount = toBaseCurrency(amount, selectedCurrency);

    updateMonthRecord((record) => ({
      ...record,
      incomeEntries: [{ id: buildId(), title, category: incomeCategory, amount: baseAmount, hoursPerDay }, ...record.incomeEntries],
    }));

    resetIncomeForm();
    setActiveView("details");
  };

  const submitOutflow = () => {
    if (outflowFormMode !== "create" && !selectedSpendingEntry) {
      Alert.alert("Missing outflow", "That outflow entry could not be found.");
      resetOutflowForm();
      return;
    }

    const amount = parseCurrencyInput(spendingAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }

    const baseAmount = toBaseCurrency(amount, selectedCurrency);

    if (outflowFormMode === "addMoney") {
      const targetEntry = selectedSpendingEntry;

      if (!targetEntry) {
        Alert.alert("Missing outflow", "That outflow entry could not be found.");
        return;
      }

      updateMonthRecord((record) => ({
        ...record,
        spendingEntries: record.spendingEntries.map((entry) =>
          entry.id === targetEntry.id ? { ...entry, amount: entry.amount + baseAmount } : entry,
        ),
      }));
    } else {
      const title = spendingTitle.trim();

      if (!title) {
        Alert.alert("Missing title", "Add a label for this outflow.");
        return;
      }

      updateMonthRecord((record) => ({
        ...record,
        spendingEntries: [{ id: buildId(), title, amount: baseAmount }, ...record.spendingEntries],
      }));
    }

    resetOutflowForm();
    setActiveView("details");
  };

  const submitNetWorth = () => {
    const amount = parseCurrencyInput(netWorthAmount);

    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert("Invalid amount", "Enter a valid current value for this source.");
      return;
    }

    const baseAmount = toBaseCurrency(amount, selectedCurrency);

    if (netWorthFormMode === "updateValue") {
      if (!selectedNetWorthEntry) {
        Alert.alert("Missing source", "That net worth source could not be found.");
        resetNetWorthForm();
        return;
      }

      updateAppData((current) => ({
        ...current,
        netWorthEntries: current.netWorthEntries.map((entry) =>
          entry.id === selectedNetWorthEntry.id ? { ...entry, amount: baseAmount } : entry,
        ),
      }));
      resetNetWorthForm();
      return;
    }

    const title = netWorthTitle.trim();

    if (!title) {
      Alert.alert("Missing source", "Add a name for this net worth source.");
      return;
    }

    updateAppData((current) => ({
      ...current,
      netWorthEntries: [{ id: buildId(), title, amount: baseAmount }, ...current.netWorthEntries],
    }));
    resetNetWorthForm();
  };

  const deleteIncome = (entryId: string) => {
    updateAppData((current) => {
      const record = current.records[selectedMonth] ?? createMonthRecord();
      const nextRecord = {
        ...record,
        incomeEntries: record.incomeEntries.filter((entry) => entry.id !== entryId),
      };
      const nextRecords = { ...current.records };

      if (isMonthRecordEmpty(nextRecord)) {
        delete nextRecords[selectedMonth];
      } else {
        nextRecords[selectedMonth] = nextRecord;
      }

      return { ...current, records: normalizeRecords(nextRecords) };
    });
  };

  const deleteOutflow = (entryId: string) => {
    updateAppData((current) => {
      const record = current.records[selectedMonth] ?? createMonthRecord();
      const nextRecord = {
        ...record,
        spendingEntries: record.spendingEntries.filter((entry) => entry.id !== entryId),
      };
      const nextRecords = { ...current.records };

      if (isMonthRecordEmpty(nextRecord)) {
        delete nextRecords[selectedMonth];
      } else {
        nextRecords[selectedMonth] = nextRecord;
      }

      return { ...current, records: normalizeRecords(nextRecords) };
    });
  };

  const deleteNetWorthEntry = (entryId: string) => {
    updateAppData((current) => ({
      ...current,
      netWorthEntries: current.netWorthEntries.filter((entry) => entry.id !== entryId),
    }));
  };

  const handleGoogleSignIn = async () => {
    try {
      if (!isSupabaseConfigured) {
        Alert.alert("Missing Supabase config", "Add your Supabase URL and publishable key first.");
        return;
      }

      setSyncStatus("syncing");
      setSyncMessage("Opening Google sign-in.");
      await signInWithGoogle();
    } catch {
      setSyncStatus("error");
      setSyncMessage("Google sign-in failed. Local data is still available.");
      Alert.alert("Sign-in error", "Could not sign in with Google.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutOfSupabase();
      setSyncStatus("local-only");
      setSyncMessage("Signed out. Your data remains stored locally on this device.");
    } catch {
      Alert.alert("Sign-out error", "Could not sign out right now.");
    }
  };

  const handleSyncNow = async () => {
    if (!session) {
      return;
    }

    try {
      await performCloudSync("manual");
    } catch {
      setSyncStatus("error");
      setSyncMessage("Manual sync failed. Local data is still safe on this device.");
      Alert.alert("Sync error", "Could not sync with Supabase right now.");
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={["top", "right", "bottom", "left"]}
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <StatusBar style={darkMode ? "light" : "dark"} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              styles.pageCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <PageTabs
              options={[
                { key: "cashflow", label: "CASHFLOW" },
                { key: "netWorth", label: "NET WORTH" },
              ]}
              activeKey={activePage}
              onSelect={(page) => setActivePage(page)}
            />
          </View>

          {activePage === "cashflow" ? (
            <CashflowPage
              selectedMonth={selectedMonth}
              selectedCurrency={selectedCurrency}
              activeView={activeView}
              activeRecord={activeRecord}
              activeSnapshot={activeSnapshot}
              incomeFormMode={incomeFormMode}
              outflowFormMode={outflowFormMode}
              selectedIncomeEntry={selectedIncomeEntry}
              selectedSpendingEntry={selectedSpendingEntry}
              incomeTitle={incomeTitle}
              incomeAmount={incomeAmount}
              incomeHoursPerDay={incomeHoursPerDay}
              incomeCategory={incomeCategory}
              spendingTitle={spendingTitle}
              spendingAmount={spendingAmount}
              displayMoney={displayMoney}
              displayHourly={displayHourly}
              setSelectedMonth={setSelectedMonth}
              setSelectedCurrency={setSelectedCurrency}
              setActiveView={setActiveView}
              setIncomeTitle={setIncomeTitle}
              setIncomeAmount={(value) => setIncomeAmount(sanitizeMoneyInput(value))}
              setIncomeHoursPerDay={(value) => setIncomeHoursPerDay(sanitizeDigitsInput(value))}
              setIncomeCategory={setIncomeCategory}
              setSpendingTitle={setSpendingTitle}
              setSpendingAmount={(value) => setSpendingAmount(sanitizeMoneyInput(value))}
              onSubmitIncome={submitIncome}
              onSubmitOutflow={submitOutflow}
              onDeleteIncome={deleteIncome}
              onDeleteOutflow={deleteOutflow}
              onOpenCreateIncome={openCreateIncome}
              onOpenCreateOutflow={openCreateOutflow}
              onOpenAddIncomeMoney={openAddIncomeMoney}
              onOpenEditIncomeHours={openEditIncomeHours}
              onOpenAddOutflowMoney={openAddOutflowMoney}
              onCancelIncomeForm={() => {
                resetIncomeForm();
                setActiveView("details");
              }}
              onCancelOutflowForm={() => {
                resetOutflowForm();
                setActiveView("details");
              }}
            />
          ) : (
            <NetWorthPage
              selectedCurrency={selectedCurrency}
              entries={appData.netWorthEntries}
              snapshot={netWorthSnapshot}
              formMode={netWorthFormMode}
              selectedEntry={selectedNetWorthEntry}
              title={netWorthTitle}
              amount={netWorthAmount}
              displayMoney={displayMoney}
              setSelectedCurrency={setSelectedCurrency}
              setTitle={setNetWorthTitle}
              setAmount={(value) => setNetWorthAmount(sanitizeMoneyInput(value))}
              onSubmit={submitNetWorth}
              onReset={resetNetWorthForm}
              onUpdateValue={openUpdateNetWorthValue}
              onDelete={deleteNetWorthEntry}
            />
          )}

          <AuthPanel
            configured={isSupabaseConfigured}
            signedInEmail={session?.user.email ?? null}
            syncStatus={syncStatus}
            syncMessage={syncMessage}
            onSignIn={handleGoogleSignIn}
            onSignOut={handleSignOut}
            onSyncNow={handleSyncNow}
          />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#111111",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 5,
  },
  pageCard: {
    gap: 10,
  },
});
