import { AppData } from "../types";
import { SUPABASE_TABLE } from "./constants";
import { nowIso } from "./shared";
import { normalizeAppData } from "./localData";
import { supabase } from "./supabase";

type SyncResolution = {
  data: AppData;
  action: "upload" | "download" | "noop";
};

const toMillis = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const fetchRemoteAppData = async (userId: string) => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.state) {
    return null;
  }

  return normalizeAppData(data.state);
};

export const pushRemoteAppData = async (userId: string, appData: AppData) => {
  if (!supabase) {
    return;
  }

  const payload: AppData = {
    ...appData,
    updatedAt: appData.updatedAt || nowIso(),
  };

  const { error } = await supabase.from(SUPABASE_TABLE).upsert(
    {
      user_id: userId,
      state: payload,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
};

export const resolveCloudData = (local: AppData, remote: AppData | null): SyncResolution => {
  if (!remote) {
    return { data: local, action: "upload" };
  }

  const localTime = toMillis(local.updatedAt);
  const remoteTime = toMillis(remote.updatedAt);

  if (remoteTime > localTime) {
    return { data: remote, action: "download" };
  }

  if (localTime > remoteTime) {
    return { data: local, action: "upload" };
  }

  return { data: local, action: "noop" };
};
