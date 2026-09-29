import { DEFAULT_CURRENCY, USD_TO_INR_RATE } from "./constants";
import { CurrencyCode } from "../types";

export const parseCurrencyInput = (value: string) => {
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const sanitizeMoneyInput = (value: string) => {
  const digitsAndDotsOnly = value.replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = digitsAndDotsOnly.split(".");

  if (fractionParts.length === 0) {
    return whole;
  }

  return `${whole}.${fractionParts.join("")}`;
};

export const sanitizeDigitsInput = (value: string) => value.replace(/\D/g, "");

export const toBaseCurrency = (amount: number, currency: CurrencyCode) =>
  currency === "USD" ? amount * USD_TO_INR_RATE : amount;

export const fromBaseCurrency = (amount: number, currency: CurrencyCode) =>
  currency === "USD" ? amount / USD_TO_INR_RATE : amount;

export const formatEditableAmount = (value: number) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
};

export const formatMoneyForCurrency = (value: number, currency: CurrencyCode = DEFAULT_CURRENCY) => {
  const formatter = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  return formatter.format(fromBaseCurrency(value || 0, currency));
};

export const formatHourlyForCurrency = (value: number, currency: CurrencyCode = DEFAULT_CURRENCY) =>
  `${formatMoneyForCurrency(value, currency)}/hr`;
