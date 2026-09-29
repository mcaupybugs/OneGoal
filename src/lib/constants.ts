import { CurrencyCode } from "../types";

export const DEFAULT_CURRENCY: CurrencyCode = "INR";
export const USD_TO_INR_RATE = 83;
export const RING_SIZE = 188;
export const RING_STROKE_WIDTH = 22;
export const NET_WORTH_RING_COLORS = ["#111111", "#4f4f4f", "#7a7a7a", "#a0a0a0", "#c2c2c2", "#d6d6d6"];

export const LOCAL_APP_DATA_KEY = "one-goal-local-app-data";
export const LEGACY_RECORDS_KEY = "one-goal-records";
export const LEGACY_NET_WORTH_KEY = "one-goal-net-worth";
export const LEGACY_CURRENCY_KEY = "one-goal-currency";

export const SUPABASE_REDIRECT_SCHEME = "onegoal";
export const SUPABASE_REDIRECT_PATH = "auth";
export const SUPABASE_TABLE = "app_states";
