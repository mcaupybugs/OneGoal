import "react-native-url-polyfill/auto";

import { createClient, Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { SUPABASE_REDIRECT_PATH, SUPABASE_REDIRECT_SCHEME } from "./constants";

WebBrowser.maybeCompleteAuthSession();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Works in Expo Go, dev builds, and standalone builds.
// Expo Go will produce an exp://... or exp.direct URL, while standalone uses onegoal://auth.
export const authRedirectUri = Linking.createURL(SUPABASE_REDIRECT_PATH, {
  scheme: SUPABASE_REDIRECT_SCHEME,
});

const secureStore = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string, {
      auth: {
        storage: secureStore,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const createSessionFromUrl = async (url: string): Promise<Session | null> => {
  if (!supabase) {
    return null;
  }

  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const code = params.code;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    return data.session;
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  return data.session;
};

export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authRedirectUri,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    throw error;
  }

  const result = await WebBrowser.openAuthSessionAsync(data?.url ?? "", authRedirectUri);

  if (result.type !== "success") {
    return null;
  }

  return createSessionFromUrl(result.url);
};

export const signOutOfSupabase = async () => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};
