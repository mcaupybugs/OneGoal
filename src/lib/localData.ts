import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeRecords } from "./cashflow";
import { normalizeNetWorthEntries } from "./netWorth";
import {
  DEFAULT_CURRENCY,
  LEGACY_CURRENCY_KEY,
  LEGACY_NET_WORTH_KEY,
  LEGACY_RECORDS_KEY,
  LOCAL_APP_DATA_KEY,
} from "./constants";
import { AppData, CurrencyCode } from "../types";
import { nowIso } from "./shared";

const extraLegacyCurrencyKeys = [LEGACY_CURRENCY_KEY];

export const createEmptyAppData = (): AppData => ({
  selectedCurrency: DEFAULT_CURRENCY,
  records: {},
  netWorthEntries: [],
  updatedAt: nowIso(),
});

export const normalizeAppData = (value: unknown): AppData => {
  if (!value || typeof value !== "object") {
    return createEmptyAppData();
  }

  const candidate = value as Partial<AppData>;
  const selectedCurrency = candidate.selectedCurrency === "USD" ? "USD" : "INR";
  const updatedAt = typeof candidate.updatedAt === "string" && candidate.updatedAt ? candidate.updatedAt : nowIso();

  return {
    selectedCurrency,
    records: normalizeRecords(candidate.records),
    netWorthEntries: normalizeNetWorthEntries(candidate.netWorthEntries),
    updatedAt,
  };
};

const hasAnyData = (data: AppData) =>
  Object.keys(data.records).length > 0 || data.netWorthEntries.length > 0;

export const loadLocalAppData = async () => {
  const raw = await AsyncStorage.getItem(LOCAL_APP_DATA_KEY);

  if (raw) {
    return normalizeAppData(JSON.parse(raw) as unknown);
  }

  const [rawRecords, rawNetWorth, ...currencyValues] = await Promise.all([
    AsyncStorage.getItem(LEGACY_RECORDS_KEY),
    AsyncStorage.getItem(LEGACY_NET_WORTH_KEY),
    ...extraLegacyCurrencyKeys.map((key) => AsyncStorage.getItem(key)),
  ]);

  const records = rawRecords ? normalizeRecords(JSON.parse(rawRecords) as unknown) : {};
  const netWorthEntries = rawNetWorth ? normalizeNetWorthEntries(JSON.parse(rawNetWorth) as unknown) : [];
  const selectedCurrency = currencyValues.find((value) => value === "USD" || value === "INR") as
    | CurrencyCode
    | undefined;

  const migrated = normalizeAppData({
    records,
    netWorthEntries,
    selectedCurrency: selectedCurrency ?? DEFAULT_CURRENCY,
    updatedAt: nowIso(),
  });

  if (hasAnyData(migrated)) {
    await saveLocalAppData(migrated);
  }

  return migrated;
};

export const saveLocalAppData = async (data: AppData) => {
  await AsyncStorage.setItem(LOCAL_APP_DATA_KEY, JSON.stringify(data));
};

export const clearLegacyLocalKeys = async () => {
  await AsyncStorage.multiRemove([LEGACY_RECORDS_KEY, LEGACY_NET_WORTH_KEY, ...extraLegacyCurrencyKeys]);
};
