import { IncomeEntry, IncomeCategory, MonthRecord, MonthSnapshot, Records, SpendingEntry } from "../types";
import { buildId } from "./shared";

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

export const currentMonthKey = new Date().toISOString().slice(0, 7);

export const getCategoryLabel = (category: IncomeCategory) =>
  category === "salary" ? "Salary" : "Side Business";

export const createMonthRecord = (): MonthRecord => ({
  incomeEntries: [],
  spendingEntries: [],
});

export const isMonthRecordEmpty = (record: MonthRecord) =>
  record.incomeEntries.length === 0 && record.spendingEntries.length === 0;

export const toMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
};

export const shiftMonth = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
};

export const getDaysInMonth = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
};

export const getEntryTotal = (entries: Array<{ amount: number }>) =>
  entries.reduce((sum: number, entry: { amount: number }) => sum + entry.amount, 0);

export const getIncomeMonthlyHours = (entry: IncomeEntry, monthKey: string) =>
  entry.hoursPerDay * getDaysInMonth(monthKey);

export const getIncomeHourlyRate = (entry: IncomeEntry, monthKey: string) => {
  const monthlyHours = getIncomeMonthlyHours(entry, monthKey);
  return monthlyHours > 0 ? entry.amount / monthlyHours : 0;
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

export const normalizeRecords = (value: unknown): Records => {
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

export const getMonthSnapshot = (record: MonthRecord, monthKey: string): MonthSnapshot => {
  const incomeEntries = Array.isArray(record.incomeEntries) ? record.incomeEntries : [];
  const spendingEntries = Array.isArray(record.spendingEntries) ? record.spendingEntries : [];
  const gross = getEntryTotal(incomeEntries);
  const spending = getEntryTotal(spendingEntries);
  const net = gross - spending;
  const trackedHours = incomeEntries.reduce(
    (sum: number, entry: IncomeEntry) => sum + getIncomeMonthlyHours(entry, monthKey),
    0,
  );

  return {
    gross,
    spending,
    net,
    trackedHours,
    grossHourly: trackedHours > 0 ? gross / trackedHours : 0,
    netHourly: trackedHours > 0 ? net / trackedHours : 0,
    salaryIncome: incomeEntries
      .filter((entry: IncomeEntry) => entry.category === "salary")
      .reduce((sum: number, entry: IncomeEntry) => sum + entry.amount, 0),
    sideBusinessIncome: incomeEntries
      .filter((entry: IncomeEntry) => entry.category === "sideBusiness")
      .reduce((sum: number, entry: IncomeEntry) => sum + entry.amount, 0),
  };
};
