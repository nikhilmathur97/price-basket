// Sentry client-side configuration
// Install: npm install @sentry/nextjs
// Then run: npx @sentry/wizard@latest -i nextjs
// Get DSN from: https://sentry.io → Your Project → Settings → Client Keys (DSN)
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    // Replay only on errors
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
  });
}
