// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production,
  // or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Capture unhandled promise rejections
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Capture 10% of sessions, 100% on error
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Session Replay configuration
  // This sets the sample rate at 10%. You may want to change it to 100% while
  // developing and then sample at a lower rate in production.
  replaysSessionSampleRate: 0.1,

  // If you're not already sampling the entire session, change the sample rate to
  // 100% when an error occurs.
  replaysOnErrorSampleRate: 1.0,
});
