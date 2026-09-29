import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import Svg, { Circle, G } from "react-native-svg";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type IncomeCategory = "salary" | "sideBusiness";
type AppPage = "cashflow" | "netWorth";
type ViewMode = "dashboard" | "details" | "income" | "outflow";
type IncomeFormMode = "create" | "addMoney" | "editHours";
type OutflowFormMode = "create" | "addMoney";
type NetWorthFormMode = "create" | "updateValue";
type CurrencyCode = "INR" | "USD";

type IncomeEntry = {
  id: string;
  title: string;
  category: IncomeCategory;
  amount: number;
  hoursPerDay: number;
};

type SpendingEntry = {
  id: string;
  title: string;
  amount: number;
};

type MonthRecord = {
  incomeEntries: IncomeEntry[];
  spendingEntries: SpendingEntry[];
};

type NetWorthEntry = {
  id: string;
  title: string;
  amount: number;
};

type Records = Record<string, MonthRecord>;

const STORAGE_KEY = "one-goal-records";
const NET_WORTH_STORAGE_KEY = "one-goal-net-worth";
const CURRENCY_STORAGE_KEY = "one-goal-currency";
const DEFAULT_CURRENCY: CurrencyCode = "INR";
const USD_TO_INR_RATE = 83;
const RING_SIZE = 188;
const RING_STROKE_WIDTH = 22;
const NET_WORTH_RING_COLORS = ["#111111", "#4f4f4f", "#7a7a7a", "#a0a0a0", "#c2c2c2", "#d6d6d6"];

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

const currentMonthKey = new Date().toISOString().slice(0, 7);

const createMonthRecord = (): MonthRecord => ({
  incomeEntries: [],
  spendingEntries: [],
});

const isMonthRecordEmpty = (record: MonthRecord) =>
  record.incomeEntries.length === 0 && record.spendingEntries.length === 0;

const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseCurrencyInput = (value: string) => {
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
};

const toMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
};

const shiftMonth = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
};

const getDaysInMonth = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
};

const toBaseCurrency = (amount: number, currency: CurrencyCode) =>
  currency === "USD" ? amount * USD_TO_INR_RATE : amount;

const fromBaseCurrency = (amount: number, currency: CurrencyCode) =>
  currency === "USD" ? amount / USD_TO_INR_RATE : amount;

const formatEditableAmount = (value: number) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
};

const formatMoneyForCurrency = (value: number, currency: CurrencyCode) => {
  const formatter = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  return formatter.format(fromBaseCurrency(value || 0, currency));
};

const formatHourlyForCurrency = (value: number, currency: CurrencyCode) =>
  `${formatMoneyForCurrency(value, currency)}/hr`;

const getCategoryLabel = (category: IncomeCategory) =>
  category === "salary" ? "Salary" : "Side Business";

const getTotal = (entries: Array<{ amount: number }>) =>
  entries.reduce((sum: number, entry: { amount: number }) => sum + entry.amount, 0);

const getIncomeMonthlyHours = (entry: IncomeEntry, monthKey: string) =>
  entry.hoursPerDay * getDaysInMonth(monthKey);

const getIncomeHourlyRate = (entry: IncomeEntry, monthKey: string) => {
  const monthlyHours = getIncomeMonthlyHours(entry, monthKey);
  return monthlyHours > 0 ? entry.amount / monthlyHours : 0;
};

const normalizeNetWorthEntry = (value: unknown): NetWorthEntry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<NetWorthEntry>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const amount = Number(candidate.amount);

  if (!title || !Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : buildId(),
    title,
    amount,
  };
};

const normalizeNetWorthEntries = (value: unknown): NetWorthEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeNetWorthEntry)
    .filter((entry): entry is NetWorthEntry => entry !== null);
};

const normalizeSpendingEntry = (value: unknown): SpendingEntry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SpendingEntry>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const amount = Number(candidate.amount);

  if (!title || !Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : buildId(),
    title,
    amount,
  };
};

const normalizeIncomeEntry = (value: unknown, fallbackHoursPerDay: number): IncomeEntry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<IncomeEntry> & { category?: unknown; hoursPerDay?: unknown };
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const amount = Number(candidate.amount);
  const hoursPerDay = Number(candidate.hoursPerDay);

  if (!title || !Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : buildId(),
    title,
    category: candidate.category === "sideBusiness" ? "sideBusiness" : "salary",
    amount,
    hoursPerDay:
      Number.isFinite(hoursPerDay) && hoursPerDay >= 0 ? hoursPerDay : Math.max(fallbackHoursPerDay, 0),
  };
};

const normalizeMonthRecord = (value: unknown): MonthRecord => {
  if (!value || typeof value !== "object") {
    return createMonthRecord();
  }

  const candidate = value as {
    incomeEntries?: unknown;
    spendingEntries?: unknown;
    hoursPerDay?: unknown;
  };

  const legacyHoursPerDay = Number(candidate.hoursPerDay);
  const fallbackHoursPerDay =
    Number.isFinite(legacyHoursPerDay) && legacyHoursPerDay >= 0 ? legacyHoursPerDay : 8;

  return {
    incomeEntries: Array.isArray(candidate.incomeEntries)
      ? candidate.incomeEntries
          .map((entry) => normalizeIncomeEntry(entry, fallbackHoursPerDay))
          .filter((entry): entry is IncomeEntry => entry !== null)
      : [],
    spendingEntries: Array.isArray(candidate.spendingEntries)
      ? candidate.spendingEntries
          .map(normalizeSpendingEntry)
          .filter((entry): entry is SpendingEntry => entry !== null)
      : [],
  };
};

const normalizeRecords = (value: unknown): Records => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const nextRecords: Records = {};

  for (const [monthKey, monthRecord] of Object.entries(value as Record<string, unknown>)) {
    const normalizedRecord = normalizeMonthRecord(monthRecord);

    if (!isMonthRecordEmpty(normalizedRecord)) {
      nextRecords[monthKey] = normalizedRecord;
    }
  }

  return nextRecords;
};

const getMonthSnapshot = (record: MonthRecord, monthKey: string) => {
  const incomeEntries = Array.isArray(record.incomeEntries) ? record.incomeEntries : [];
  const spendingEntries = Array.isArray(record.spendingEntries) ? record.spendingEntries : [];
  const gross = getTotal(incomeEntries);
  const spending = getTotal(spendingEntries);
  const net = gross - spending;
  const trackedHours = incomeEntries.reduce(
    (sum: number, entry: IncomeEntry) => sum + getIncomeMonthlyHours(entry, monthKey),
    0,
  );
  const grossHourly = trackedHours > 0 ? gross / trackedHours : 0;
  const netHourly = trackedHours > 0 ? net / trackedHours : 0;
  const salaryIncome = incomeEntries
    .filter((entry: IncomeEntry) => entry.category === "salary")
    .reduce((sum: number, entry: IncomeEntry) => sum + entry.amount, 0);
  const sideBusinessIncome = incomeEntries
    .filter((entry: IncomeEntry) => entry.category === "sideBusiness")
    .reduce((sum: number, entry: IncomeEntry) => sum + entry.amount, 0);

  return {
    gross,
    spending,
    net,
    trackedHours,
    grossHourly,
    netHourly,
    salaryIncome,
    sideBusinessIncome,
  };
};

const getNetWorthSnapshot = (entries: NetWorthEntry[]) => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const total = getTotal(safeEntries);
  const sourceTotals = safeEntries.map((entry: NetWorthEntry, index: number) => ({
    id: entry.id,
    label: entry.title,
    color: NET_WORTH_RING_COLORS[index % NET_WORTH_RING_COLORS.length],
    total: entry.amount,
  }));

  return {
    total,
    sourceTotals,
  };
};

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>("cashflow");
  const [records, setRecords] = useState<Records>({});
  const [netWorthEntries, setNetWorthEntries] = useState<NetWorthEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [activeView, setActiveView] = useState<ViewMode>("dashboard");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [incomeFormMode, setIncomeFormMode] = useState<IncomeFormMode>("create");
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);
  const [outflowFormMode, setOutflowFormMode] = useState<OutflowFormMode>("create");
  const [selectedSpendingId, setSelectedSpendingId] = useState<string | null>(null);
  const [netWorthFormMode, setNetWorthFormMode] = useState<NetWorthFormMode>("create");
  const [selectedNetWorthId, setSelectedNetWorthId] = useState<string | null>(null);
  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeHoursPerDay, setIncomeHoursPerDay] = useState("8");
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>("salary");
  const [spendingTitle, setSpendingTitle] = useState("");
  const [spendingAmount, setSpendingAmount] = useState("");
  const [netWorthTitle, setNetWorthTitle] = useState("");
  const [netWorthAmount, setNetWorthAmount] = useState("");
  const [isReady, setIsReady] = useState(false);
  const previousCurrencyRef = useRef<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const [rawRecords, rawCurrency, rawNetWorth] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(CURRENCY_STORAGE_KEY),
          AsyncStorage.getItem(NET_WORTH_STORAGE_KEY),
        ]);

        if (rawRecords) {
          const parsed = JSON.parse(rawRecords) as unknown;
          setRecords(normalizeRecords(parsed));
        }

        if (rawCurrency === "INR" || rawCurrency === "USD") {
          setSelectedCurrency(rawCurrency);
          previousCurrencyRef.current = rawCurrency;
        }

        if (rawNetWorth) {
          const parsedNetWorth = JSON.parse(rawNetWorth) as unknown;
          setNetWorthEntries(normalizeNetWorthEntries(parsedNetWorth));
        }
      } catch {
        Alert.alert("Storage error", "Could not load your saved monthly history.");
      } finally {
        setIsReady(true);
      }
    };

    loadRecords();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const persistedRecords = Object.fromEntries(
      Object.entries(records).filter(([, record]) => !isMonthRecordEmpty(record)),
    );

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRecords)).catch(() => {
      Alert.alert("Save error", "Could not save your latest changes.");
    });
  }, [isReady, records]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    AsyncStorage.setItem(CURRENCY_STORAGE_KEY, selectedCurrency).catch(() => {
      Alert.alert("Save error", "Could not save your currency preference.");
    });
  }, [isReady, selectedCurrency]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    AsyncStorage.setItem(NET_WORTH_STORAGE_KEY, JSON.stringify(netWorthEntries)).catch(() => {
      Alert.alert("Save error", "Could not save your net worth data.");
    });
  }, [isReady, netWorthEntries]);

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

  const activeRecord = records[selectedMonth] ?? createMonthRecord();
  const activeSnapshot = useMemo(
    () => getMonthSnapshot(activeRecord, selectedMonth),
    [activeRecord, selectedMonth],
  );
  const selectedIncomeEntry =
    (Array.isArray(activeRecord.incomeEntries) ? activeRecord.incomeEntries : []).find(
      (entry: IncomeEntry) => entry.id === selectedIncomeId,
    ) ?? null;
  const selectedSpendingEntry =
    (Array.isArray(activeRecord.spendingEntries) ? activeRecord.spendingEntries : []).find(
      (entry: SpendingEntry) => entry.id === selectedSpendingId,
    ) ?? null;
  const selectedNetWorthEntry =
    (Array.isArray(netWorthEntries) ? netWorthEntries : []).find(
      (entry: NetWorthEntry) => entry.id === selectedNetWorthId,
    ) ?? null;
  const netWorthSnapshot = useMemo(() => getNetWorthSnapshot(netWorthEntries), [netWorthEntries]);
  const displayMoney = (value: number) => formatMoneyForCurrency(value, selectedCurrency);
  const displayHourly = (value: number) => formatHourlyForCurrency(value, selectedCurrency);

  const updateMonthRecord = (updater: (record: MonthRecord) => MonthRecord) => {
    setRecords((current: Records) => ({
      ...current,
      [selectedMonth]: updater(current[selectedMonth] ?? createMonthRecord()),
    }));
  };

  const resetIncomeForm = () => {
    setIncomeFormMode("create");
    setSelectedIncomeId(null);
    setIncomeTitle("");
    setIncomeAmount("");
    setIncomeHoursPerDay("8");
    setIncomeCategory("salary");
  };

  const openCreateIncome = () => {
    resetIncomeForm();
    setActiveView("income");
  };

  const resetOutflowForm = () => {
    setOutflowFormMode("create");
    setSelectedSpendingId(null);
    setSpendingTitle("");
    setSpendingAmount("");
  };

  const openCreateOutflow = () => {
    resetOutflowForm();
    setActiveView("outflow");
  };

  const resetNetWorthForm = () => {
    setNetWorthFormMode("create");
    setSelectedNetWorthId(null);
    setNetWorthTitle("");
    setNetWorthAmount("");
  };

  const openCreateNetWorth = () => {
    resetNetWorthForm();
  };

  const openAddMoney = (entry: IncomeEntry) => {
    setIncomeFormMode("addMoney");
    setSelectedIncomeId(entry.id);
    setIncomeTitle(entry.title);
    setIncomeAmount("");
    setIncomeHoursPerDay(String(entry.hoursPerDay));
    setIncomeCategory(entry.category);
    setActiveView("income");
  };

  const openEditHours = (entry: IncomeEntry) => {
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
      const displayAmount = parseCurrencyInput(incomeAmount);

      if (!Number.isFinite(displayAmount) || displayAmount <= 0) {
        Alert.alert("Invalid amount", "Enter an amount greater than zero to add to this source.");
        return;
      }

      const amount = toBaseCurrency(displayAmount, selectedCurrency);

      updateMonthRecord((record) => ({
        ...record,
        incomeEntries: record.incomeEntries.map((entry: IncomeEntry) =>
          entry.id === selectedIncomeEntry?.id
            ? { ...entry, amount: entry.amount + amount }
            : entry,
        ),
      }));

      resetIncomeForm();
      setActiveView("details");
      return;
    }

    if (incomeFormMode === "editHours") {
      const hoursPerDay = Number(incomeHoursPerDay);

      if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
        Alert.alert("Invalid hours", "Enter the number of hours you work per day for this source.");
        return;
      }

      updateMonthRecord((record) => ({
        ...record,
        incomeEntries: record.incomeEntries.map((entry: IncomeEntry) =>
          entry.id === selectedIncomeEntry?.id ? { ...entry, hoursPerDay } : entry,
        ),
      }));

      resetIncomeForm();
      setActiveView("details");
      return;
    }

    const title = incomeTitle.trim();
    const displayAmount = parseCurrencyInput(incomeAmount);
    const hoursPerDay = Number(incomeHoursPerDay);

    if (!title) {
      Alert.alert("Missing title", "Add the income source name.");
      return;
    }

    if (!Number.isFinite(displayAmount) || displayAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a monthly inflow amount greater than zero.");
      return;
    }

    if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
      Alert.alert("Invalid hours", "Enter the number of hours you work per day for this source.");
      return;
    }

    const amount = toBaseCurrency(displayAmount, selectedCurrency);

    updateMonthRecord((record) => ({
      ...record,
      incomeEntries: [
        {
          id: buildId(),
          title,
          category: incomeCategory,
          amount,
          hoursPerDay,
        },
        ...record.incomeEntries,
      ],
    }));

    resetIncomeForm();
    setActiveView("details");
  };

  const submitOutflow = () => {
    if (outflowFormMode === "addMoney") {
      if (!selectedSpendingEntry) {
        Alert.alert("Missing outflow", "That outflow entry could not be found.");
        resetOutflowForm();
        return;
      }

      const displayAmount = parseCurrencyInput(spendingAmount);

      if (!Number.isFinite(displayAmount) || displayAmount <= 0) {
        Alert.alert("Invalid amount", "Enter an amount greater than zero to add to this outflow.");
        return;
      }

      const amount = toBaseCurrency(displayAmount, selectedCurrency);

      updateMonthRecord((record) => ({
        ...record,
        spendingEntries: record.spendingEntries.map((entry: SpendingEntry) =>
          entry.id === selectedSpendingEntry.id ? { ...entry, amount: entry.amount + amount } : entry,
        ),
      }));

      resetOutflowForm();
      setActiveView("details");
      return;
    }

    const title = spendingTitle.trim();
    const displayAmount = parseCurrencyInput(spendingAmount);

    if (!title) {
      Alert.alert("Missing title", "Add a label for this outflow.");
      return;
    }

    if (!Number.isFinite(displayAmount) || displayAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a monthly outflow amount greater than zero.");
      return;
    }

    const amount = toBaseCurrency(displayAmount, selectedCurrency);

    updateMonthRecord((record) => ({
      ...record,
      spendingEntries: [{ id: buildId(), title, amount }, ...record.spendingEntries],
    }));

    resetOutflowForm();
    setActiveView("details");
  };

  const submitNetWorth = () => {
    if (netWorthFormMode === "updateValue") {
      if (!selectedNetWorthEntry) {
        Alert.alert("Missing source", "That net worth source could not be found.");
        resetNetWorthForm();
        return;
      }

      const displayAmount = parseCurrencyInput(netWorthAmount);

      if (!Number.isFinite(displayAmount) || displayAmount < 0) {
        Alert.alert("Invalid amount", "Enter a valid current value for this source.");
        return;
      }

      const amount = toBaseCurrency(displayAmount, selectedCurrency);

      setNetWorthEntries((current: NetWorthEntry[]) =>
        current.map((entry: NetWorthEntry) =>
          entry.id === selectedNetWorthEntry.id ? { ...entry, amount } : entry,
        ),
      );

      resetNetWorthForm();
      return;
    }

    const title = netWorthTitle.trim();
    const displayAmount = parseCurrencyInput(netWorthAmount);

    if (!title) {
      Alert.alert("Missing source", "Add a name for this net worth source.");
      return;
    }

    if (!Number.isFinite(displayAmount) || displayAmount < 0) {
      Alert.alert("Invalid amount", "Enter a valid current value for this source.");
      return;
    }

    const amount = toBaseCurrency(displayAmount, selectedCurrency);

    setNetWorthEntries((current: NetWorthEntry[]) => [
      {
        id: buildId(),
        title,
        amount,
      },
      ...current,
    ]);

    resetNetWorthForm();
  };

  const deleteNetWorthEntry = (entryId: string) => {
    setNetWorthEntries((current: NetWorthEntry[]) =>
      current.filter((entry: NetWorthEntry) => entry.id !== entryId),
    );
  };

  const deleteIncome = (entryId: string) => {
    setRecords((current: Records) => {
      const record = current[selectedMonth] ?? createMonthRecord();
      const nextRecord: MonthRecord = {
        ...record,
        incomeEntries: record.incomeEntries.filter((entry: IncomeEntry) => entry.id !== entryId),
      };

      if (isMonthRecordEmpty(nextRecord)) {
        const { [selectedMonth]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [selectedMonth]: nextRecord,
      };
    });
  };

  const deleteSpending = (entryId: string) => {
    setRecords((current: Records) => {
      const record = current[selectedMonth] ?? createMonthRecord();
      const nextRecord: MonthRecord = {
        ...record,
        spendingEntries: record.spendingEntries.filter((entry: SpendingEntry) => entry.id !== entryId),
      };

      if (isMonthRecordEmpty(nextRecord)) {
        const { [selectedMonth]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [selectedMonth]: nextRecord,
      };
    });
  };

  const renderDashboard = () => (
    <>
      <View style={styles.metricGrid}>
        <View style={[styles.card, styles.metricCard, styles.tiltLeft]}>
          <Text style={styles.metricLabel}>Monthly Inflow</Text>
          <Text style={styles.metricValue}>{displayMoney(activeSnapshot.gross)}</Text>
          <Text style={styles.metricHint}>All income sources combined</Text>
        </View>

        <View style={[styles.card, styles.metricCard, styles.tiltRight]}>
          <Text style={styles.metricLabel}>Monthly Outflow</Text>
          <Text style={styles.metricValue}>{displayMoney(activeSnapshot.spending)}</Text>
          <Text style={styles.metricHint}>What went out this month</Text>
        </View>

        <View style={[styles.card, styles.metricCard, styles.tiltRight]}>
          <Text style={styles.metricLabel}>Combined Gross / hr</Text>
          <Text style={styles.metricValue}>{displayHourly(activeSnapshot.grossHourly)}</Text>
          <Text style={styles.metricHint}>Before outflow is deducted</Text>
        </View>

        <View style={[styles.card, styles.metricCard, styles.tiltLeft]}>
          <Text style={styles.metricLabel}>Combined Net / hr</Text>
          <Text style={styles.metricValue}>{displayHourly(activeSnapshot.netHourly)}</Text>
          <Text style={styles.metricHint}>After outflow is deducted</Text>
        </View>
      </View>

      <View style={[styles.card, styles.progressCard]}>
        <Text style={styles.sectionLabel}>BREAKDOWN</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Salary</Text>
            <Text style={styles.scoreValue}>{displayMoney(activeSnapshot.salaryIncome)}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Side Business</Text>
            <Text style={styles.scoreValue}>{displayMoney(activeSnapshot.sideBusinessIncome)}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Net</Text>
            <Text style={styles.scoreValue}>{displayMoney(activeSnapshot.net)}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Tracked Hours</Text>
            <Text style={styles.scoreValue}>{activeSnapshot.trackedHours.toFixed(1)} hr</Text>
          </View>
        </View>
        <Text style={styles.helperText}>
          Combined hourly income uses each source&apos;s monthly amount divided by hours per day times
          the number of days in this month.
        </Text>
      </View>

      <View style={[styles.card, styles.quickActionCard]}>
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickActionRow}>
          <Pressable style={styles.actionButton} onPress={openCreateIncome}>
            <Text style={styles.actionButtonText}>ADD INCOME</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={openCreateOutflow}>
            <Text style={styles.actionButtonText}>ADD OUTFLOW</Text>
          </Pressable>
        </View>
      </View>
    </>
  );

  const renderIncomeForm = () => (
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
            <Pressable
              style={[styles.categoryButton, incomeCategory === "salary" && styles.categoryButtonActive]}
              onPress={() => setIncomeCategory("salary")}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  incomeCategory === "salary" && styles.categoryButtonTextActive,
                ]}
              >
                SALARY
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.categoryButton,
                incomeCategory === "sideBusiness" && styles.categoryButtonActive,
              ]}
              onPress={() => setIncomeCategory("sideBusiness")}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  incomeCategory === "sideBusiness" && styles.categoryButtonTextActive,
                ]}
              >
                SIDE BUSINESS
              </Text>
            </Pressable>
          </View>
          <TextInput
            value={incomeTitle}
            onChangeText={setIncomeTitle}
            placeholder="Source name"
            placeholderTextColor="#7a7a7a"
            style={styles.input}
          />
          <TextInput
            value={incomeAmount}
            onChangeText={setIncomeAmount}
            keyboardType="decimal-pad"
            placeholder="Monthly inflow amount"
            placeholderTextColor="#7a7a7a"
            style={styles.input}
          />
          <TextInput
            value={incomeHoursPerDay}
            onChangeText={setIncomeHoursPerDay}
            keyboardType="decimal-pad"
            placeholder="Hours worked per day for this source"
            placeholderTextColor="#7a7a7a"
            style={styles.input}
          />
        </>
      ) : (
        <>
          <View style={styles.focusBox}>
            <Text style={styles.focusTitle}>{selectedIncomeEntry?.title ?? incomeTitle}</Text>
            <Text style={styles.focusMeta}>
              {getCategoryLabel(selectedIncomeEntry?.category ?? incomeCategory)}
            </Text>
            {selectedIncomeEntry ? (
              <>
                <Text style={styles.focusText}>
                  Current amount: {displayMoney(selectedIncomeEntry.amount)}
                </Text>
                <Text style={styles.focusText}>
                  Current hours / day: {selectedIncomeEntry.hoursPerDay}
                </Text>
              </>
            ) : null}
          </View>
          {incomeFormMode === "addMoney" ? (
            <TextInput
              value={incomeAmount}
              onChangeText={setIncomeAmount}
              keyboardType="decimal-pad"
              placeholder="Additional amount to add"
              placeholderTextColor="#7a7a7a"
              style={styles.input}
            />
          ) : (
            <TextInput
              value={incomeHoursPerDay}
              onChangeText={setIncomeHoursPerDay}
              keyboardType="decimal-pad"
              placeholder="New hours worked per day"
              placeholderTextColor="#7a7a7a"
              style={styles.input}
            />
          )}
        </>
      )}
      <View style={styles.formActionRow}>
        <Pressable style={styles.secondaryButton} onPress={() => {
          resetIncomeForm();
          setActiveView("details");
        }}>
          <Text style={styles.secondaryButtonText}>CANCEL</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={submitIncome}>
          <Text style={styles.actionButtonText}>
            {incomeFormMode === "create"
              ? "SAVE INCOME"
              : incomeFormMode === "addMoney"
                ? "ADD MONEY"
                : "SAVE HOURS"}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderOutflowForm = () => (
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
          placeholderTextColor="#7a7a7a"
          style={styles.input}
        />
      ) : (
        <View style={styles.focusBox}>
          <Text style={styles.focusTitle}>{selectedSpendingEntry?.title ?? spendingTitle}</Text>
          {selectedSpendingEntry ? (
            <Text style={styles.focusText}>
              Current amount: {displayMoney(selectedSpendingEntry.amount)}
            </Text>
          ) : null}
        </View>
      )}
      <TextInput
        value={spendingAmount}
        onChangeText={setSpendingAmount}
        keyboardType="decimal-pad"
        placeholder={outflowFormMode === "create" ? "Monthly outflow amount" : "Additional amount to add"}
        placeholderTextColor="#7a7a7a"
        style={styles.input}
      />
      <View style={styles.formActionRow}>
        <Pressable style={styles.secondaryButton} onPress={() => {
          resetOutflowForm();
          setActiveView("details");
        }}>
          <Text style={styles.secondaryButtonText}>CANCEL</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={submitOutflow}>
          <Text style={styles.actionButtonText}>
            {outflowFormMode === "create" ? "SAVE OUTFLOW" : "ADD MONEY"}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderDetails = () => (
    <>
      <View style={[styles.card, styles.listCard]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>INCOME DETAILS</Text>
          <Text style={styles.sectionTotal}>{displayMoney(activeSnapshot.gross)}</Text>
        </View>
        {activeRecord.incomeEntries.length === 0 ? (
          <Text style={styles.emptyText}>No income sources yet for this month.</Text>
        ) : (
          activeRecord.incomeEntries.map((entry: IncomeEntry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryContent}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                <Text style={styles.entryMeta}>{getCategoryLabel(entry.category)}</Text>
                <Text style={styles.entryAmount}>Monthly: {displayMoney(entry.amount)}</Text>
                <Text style={styles.entryAmount}>Hours / day: {entry.hoursPerDay}</Text>
                <Text style={styles.entryAmount}>
                  Hourly: {displayHourly(getIncomeHourlyRate(entry, selectedMonth))}
                </Text>
                <View style={styles.entryActionRow}>
                  <Pressable style={styles.inlineActionButton} onPress={() => openAddMoney(entry)}>
                    <Text style={styles.inlineActionButtonText}>ADD MONEY</Text>
                  </Pressable>
                  <Pressable style={styles.inlineActionButton} onPress={() => openEditHours(entry)}>
                    <Text style={styles.inlineActionButtonText}>EDIT HOURS</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => deleteIncome(entry.id)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>X</Text>
              </Pressable>
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
          activeRecord.spendingEntries.map((entry: SpendingEntry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryContent}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                <Text style={styles.entryAmount}>{displayMoney(entry.amount)}</Text>
                <View style={styles.entryActionRow}>
                  <Pressable style={styles.inlineActionButton} onPress={() => openAddOutflowMoney(entry)}>
                    <Text style={styles.inlineActionButtonText}>ADD MONEY</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => deleteSpending(entry.id)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>X</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

    </>
  );

  const renderNetWorthPage = () => {
    const radius = (RING_SIZE - RING_STROKE_WIDTH) / 2;
    const circumference = 2 * Math.PI * radius;
    let progressOffset = 0;

    const ringSegments = (netWorthSnapshot.sourceTotals ?? [])
      .filter((item) => item.total > 0 && netWorthSnapshot.total > 0)
      .map((item) => {
        const segmentLength = (item.total / netWorthSnapshot.total) * circumference;
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
        <View style={[styles.card, styles.netWorthSummaryCard]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>NET WORTH</Text>
            <Pressable
              style={styles.currencyToggleButton}
              onPress={() => setSelectedCurrency(selectedCurrency === "INR" ? "USD" : "INR")}
            >
              <Text style={styles.currencyToggleText}>{selectedCurrency}</Text>
            </Pressable>
          </View>
          <Text style={styles.netWorthTotalLabel}>Total Net Worth</Text>
          <Text style={styles.netWorthTotalValue}>{displayMoney(netWorthSnapshot.total)}</Text>
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <G rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={radius}
                  stroke="#d8d8d8"
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
              <Text style={styles.ringCenterValue}>{netWorthEntries.length}</Text>
            </View>
          </View>
          <View style={styles.netWorthLegendList}>
            {(netWorthSnapshot.sourceTotals ?? []).map((item) => (
              <View key={item.id} style={styles.legendRow}>
                <View style={styles.legendLabelRow}>
                  <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
                <View style={styles.legendValues}>
                  <Text style={styles.legendAmount}>{displayMoney(item.total)}</Text>
                  <Text style={styles.legendShare}>
                    {netWorthSnapshot.total > 0 ? `${Math.round((item.total / netWorthSnapshot.total) * 100)}%` : "0%"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.formCard]}>
          <Text style={styles.sectionLabel}>
            {netWorthFormMode === "create" ? "ADD SOURCE" : "UPDATE VALUE"}
          </Text>
          <Text style={styles.helperText}>
            {netWorthFormMode === "create"
              ? "Track current values across any assets or sources you want."
              : "Update the latest value for this source."}
          </Text>
          {netWorthFormMode === "create" ? (
            <>
              <TextInput
                value={netWorthTitle}
                onChangeText={setNetWorthTitle}
                placeholder="Source name, asset name, or account"
                placeholderTextColor="#7a7a7a"
                style={styles.input}
              />
            </>
          ) : (
            <View style={styles.focusBox}>
              <Text style={styles.focusTitle}>{selectedNetWorthEntry?.title ?? netWorthTitle}</Text>
              {selectedNetWorthEntry ? (
                <Text style={styles.focusText}>
                  Current value: {displayMoney(selectedNetWorthEntry.amount)}
                </Text>
              ) : null}
            </View>
          )}
          <TextInput
            value={netWorthAmount}
            onChangeText={setNetWorthAmount}
            keyboardType="decimal-pad"
            placeholder={netWorthFormMode === "create" ? "Current value" : "Updated value"}
            placeholderTextColor="#7a7a7a"
            style={styles.input}
          />
          <View style={styles.formActionRow}>
            <Pressable style={styles.secondaryButton} onPress={openCreateNetWorth}>
              <Text style={styles.secondaryButtonText}>
                {netWorthFormMode === "create" ? "CLEAR" : "CANCEL"}
              </Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={submitNetWorth}>
              <Text style={styles.actionButtonText}>
                {netWorthFormMode === "create" ? "SAVE SOURCE" : "SAVE VALUE"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, styles.listCard]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>ASSET SOURCES</Text>
            <Text style={styles.sectionTotal}>{netWorthEntries.length}</Text>
          </View>
          {netWorthEntries.length === 0 ? (
            <Text style={styles.emptyText}>No net worth sources yet.</Text>
          ) : (
            netWorthEntries.map((entry: NetWorthEntry) => (
              <View key={entry.id} style={styles.entryRow}>
                <View style={styles.entryContent}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <Text style={styles.entryAmount}>{displayMoney(entry.amount)}</Text>
                  <View style={styles.entryActionRow}>
                    <Pressable style={styles.inlineActionButton} onPress={() => openUpdateNetWorthValue(entry)}>
                      <Text style={styles.inlineActionButtonText}>UPDATE VALUE</Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable onPress={() => deleteNetWorthEntry(entry.id)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>X</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, styles.pageCard]}>
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tabButton, activePage === "cashflow" && styles.tabButtonActive]}
                onPress={() => setActivePage("cashflow")}
              >
                <Text style={[styles.tabText, activePage === "cashflow" && styles.tabTextActive]}>
                  CASHFLOW
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, activePage === "netWorth" && styles.tabButtonActive]}
                onPress={() => setActivePage("netWorth")}
              >
                <Text style={[styles.tabText, activePage === "netWorth" && styles.tabTextActive]}>
                  NET WORTH
                </Text>
              </Pressable>
            </View>
          </View>

          {activePage === "cashflow" ? (
            <>
              <View style={[styles.card, styles.monthCard]}>
                <View style={styles.monthHeaderRow}>
                  <Text style={styles.sectionLabel}>MONTH</Text>
                  <Pressable
                    style={styles.currencyToggleButton}
                    onPress={() => setSelectedCurrency(selectedCurrency === "INR" ? "USD" : "INR")}
                  >
                    <Text style={styles.currencyToggleText}>{selectedCurrency}</Text>
                  </Pressable>
                </View>
                <View style={styles.monthRow}>
                  <Pressable
                    style={styles.navButton}
                    onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                  >
                    <Text style={styles.navButtonText}>PREV</Text>
                  </Pressable>
                  <Text style={styles.monthTitle}>{toMonthLabel(selectedMonth)}</Text>
                  <Pressable
                    style={styles.navButton}
                    onPress={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                  >
                    <Text style={styles.navButtonText}>NEXT</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.card, styles.tabCard]}>
                <View style={styles.tabRow}>
                  <Pressable
                    style={[styles.tabButton, activeView === "dashboard" && styles.tabButtonActive]}
                    onPress={() => setActiveView("dashboard")}
                  >
                    <Text style={[styles.tabText, activeView === "dashboard" && styles.tabTextActive]}>
                      DASHBOARD
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.tabButton, activeView === "details" && styles.tabButtonActive]}
                    onPress={() => setActiveView("details")}
                  >
                    <Text style={[styles.tabText, activeView === "details" && styles.tabTextActive]}>
                      DETAILS
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.tabRow}>
                  <Pressable
                    style={[styles.tabButton, activeView === "income" && styles.tabButtonActive]}
                    onPress={() => setActiveView("income")}
                  >
                    <Text style={[styles.tabText, activeView === "income" && styles.tabTextActive]}>
                      ADD INCOME
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.tabButton, activeView === "outflow" && styles.tabButtonActive]}
                    onPress={() => setActiveView("outflow")}
                  >
                    <Text style={[styles.tabText, activeView === "outflow" && styles.tabTextActive]}>
                      ADD OUTFLOW
                    </Text>
                  </Pressable>
                </View>
              </View>

              {activeView === "dashboard" && renderDashboard()}
              {activeView === "details" && renderDetails()}
              {activeView === "income" && renderIncomeForm()}
              {activeView === "outflow" && renderOutflowForm()}
            </>
          ) : (
            renderNetWorthPage()
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthCard: {
    gap: 12,
  },
  pageCard: {
    gap: 10,
  },
  tabCard: {
    gap: 10,
  },
  netWorthSummaryCard: {
    gap: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.3,
    color: "#111111",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111111",
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
    color: "#111111",
    textTransform: "uppercase",
  },
  currencyToggleButton: {
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    backgroundColor: "#111111",
  },
  currencyToggleText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  netWorthTotalLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#555555",
    textTransform: "uppercase",
  },
  netWorthTotalValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111111",
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenterLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenterTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#555555",
    textTransform: "uppercase",
  },
  ringCenterValue: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "900",
    color: "#111111",
  },
  netWorthLegendList: {
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  legendLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#111111",
  },
  legendText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111111",
    textTransform: "uppercase",
  },
  legendValues: {
    alignItems: "flex-end",
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111111",
  },
  legendShare: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#555555",
  },
  navButton: {
    borderWidth: 2,
    borderColor: "#111111",
    backgroundColor: "#111111",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 68,
    alignItems: "center",
  },
  navButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  historyRow: {
    gap: 10,
    paddingRight: 4,
  },
  historyChip: {
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  historyChipActive: {
    backgroundColor: "#111111",
  },
  historyChipText: {
    color: "#111111",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  historyChipTextActive: {
    color: "#ffffff",
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
  },
  tabButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  tabButtonActive: {
    backgroundColor: "#111111",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#111111",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  metricGrid: {
    gap: 14,
  },
  metricCard: {
    minHeight: 118,
    justifyContent: "space-between",
  },
  tiltLeft: {
    transform: [{ rotate: "-1deg" }],
  },
  tiltRight: {
    transform: [{ rotate: "1deg" }],
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
    color: "#111111",
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111111",
  },
  metricHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#404040",
  },
  progressCard: {
    gap: 14,
  },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  scoreItem: {
    flexGrow: 1,
    minWidth: 120,
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f7f7f7",
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111111",
    textTransform: "uppercase",
  },
  scoreValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "900",
    color: "#111111",
  },
  formCard: {
    gap: 12,
  },
  focusBox: {
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#f7f7f7",
    gap: 4,
  },
  focusTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111111",
    textTransform: "uppercase",
  },
  focusMeta: {
    fontSize: 12,
    fontWeight: "900",
    color: "#555555",
    textTransform: "uppercase",
  },
  focusText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
  },
  formActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  categoryButtonActive: {
    backgroundColor: "#111111",
  },
  categoryButtonText: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
  },
  categoryButtonTextActive: {
    color: "#ffffff",
  },
  input: {
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#404040",
  },
  quickActionCard: {
    gap: 12,
  },
  quickActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#111111",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  listCard: {
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#575757",
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  entryContent: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111111",
    textTransform: "uppercase",
  },
  entryMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "900",
    color: "#555555",
    textTransform: "uppercase",
  },
  entryAmount: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
  },
  entryActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  inlineActionButton: {
    borderWidth: 2,
    borderColor: "#111111",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#ffffff",
  },
  inlineActionButtonText: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f4f4",
  },
  deleteText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111111",
  },
});
