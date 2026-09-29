# OneGoal

OneGoal is a simple Expo app for tracking monthly inflow, monthly outflow, and hourly income across multiple income sources.

## MVP

- Dashboard-first layout
- Monthly inflow and outflow tracking
- Income categories for `salary` and `side business`
- Per-source hourly income based on source amount and hours worked per day
- Combined gross hourly income and combined net hourly income
- Update existing income and outflow entries by adding more money
- Edit working hours for an existing income source
- INR and USD display toggle with INR as the default
- Local persistence with AsyncStorage
- Comic-style black-and-white interface for iOS and Android

## Stack

- Expo
- React Native
- TypeScript
- AsyncStorage

## Local Development

1. Install dependencies

```bash
npm install
```

2. Start the Expo dev server

```bash
npm start
```

3. Run platform builds

```bash
npm run ios
```

```bash
npm run android
```

## Validation

```bash
npm run typecheck
```

```bash
npx expo export --platform ios --platform android
```

## Notes

- Data is stored locally on the device.
- The currency toggle changes displayed values between INR and USD.
- Stored amounts are persisted in INR internally and converted for display.
