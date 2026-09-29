# Supabase Setup

## Environment Variables

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Use the values from Supabase Dashboard -> Connect -> Expo React Native / Mobile.

## Database

Run `supabase/schema.sql` inside the Supabase SQL editor.

This creates one secure table:

- `public.app_states`

Each signed-in user can only read and write their own row.

## Auth Provider

In Supabase Dashboard:

1. Go to `Authentication -> Providers`
2. Enable `Google`
3. Add your Google OAuth client credentials there

## Google Cloud Credentials You Need

Create a Google OAuth client and copy:

1. `Client ID`
2. `Client Secret`

Add those into the Google provider form inside Supabase, not into the app code.

## Redirect URLs To Add In Supabase

Go to `Authentication -> URL Configuration` and add:

```text
onegoal://auth
```

If you also test in Expo Go, add Expo-compatible redirects too:

```text
exp://**
https://*.exp.direct/**
```

Why: Expo Go does not behave like a standalone app. During development the callback usually comes back through an Expo dev URL instead of only `onegoal://auth`.

## Local-First Behavior

- The app always stores data locally first
- Sign-in is optional
- After sign-in, the app syncs the current local state to Supabase or pulls the newer cloud state
- Auth session storage uses Expo Secure Store

## Security Model

- No service role key is used in the client app
- The app only uses the Supabase publishable key
- Row Level Security restricts each row to its owning user
- Session persistence is stored in Secure Store
