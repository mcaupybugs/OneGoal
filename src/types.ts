export type IncomeCategory = "salary" | "sideBusiness";
export type AppPage = "cashflow" | "netWorth";
export type ViewMode = "dashboard" | "details" | "income" | "outflow";
export type IncomeFormMode = "create" | "addMoney" | "editHours";
export type OutflowFormMode = "create" | "addMoney";
export type NetWorthFormMode = "create" | "updateValue";
export type CurrencyCode = "INR" | "USD";

export type IncomeEntry = {
  id: string;
  title: string;
  category: IncomeCategory;
  amount: number;
  hoursPerDay: number;
};

export type SpendingEntry = {
  id: string;
  title: string;
  amount: number;
};

export type MonthRecord = {
  incomeEntries: IncomeEntry[];
  spendingEntries: SpendingEntry[];
};

export type NetWorthEntry = {
  id: string;
  title: string;
  amount: number;
};

export type Records = Record<string, MonthRecord>;

export type AppData = {
  selectedCurrency: CurrencyCode;
  records: Records;
  netWorthEntries: NetWorthEntry[];
  updatedAt: string;
};

export type MonthSnapshot = {
  gross: number;
  spending: number;
  net: number;
  trackedHours: number;
  grossHourly: number;
  netHourly: number;
  salaryIncome: number;
  sideBusinessIncome: number;
};

export type NetWorthSlice = {
  id: string;
  label: string;
  color: string;
  total: number;
};

export type NetWorthSnapshot = {
  total: number;
  sourceTotals: NetWorthSlice[];
};

export type SyncStatus = "local-only" | "syncing" | "synced" | "error";
