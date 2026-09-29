import { NetWorthEntry, NetWorthSnapshot } from "../types";
import { NET_WORTH_RING_COLORS } from "./constants";
import { buildId } from "./shared";
import { getEntryTotal } from "./cashflow";

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

export const normalizeNetWorthEntries = (value: unknown): NetWorthEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeNetWorthEntry)
    .filter((entry): entry is NetWorthEntry => entry !== null);
};

export const getNetWorthSnapshot = (entries: NetWorthEntry[]): NetWorthSnapshot => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const total = getEntryTotal(safeEntries);

  return {
    total,
    sourceTotals: safeEntries.map((entry: NetWorthEntry, index: number) => ({
      id: entry.id,
      label: entry.title,
      color: NET_WORTH_RING_COLORS[index % NET_WORTH_RING_COLORS.length],
      total: entry.amount,
    })),
  };
};
