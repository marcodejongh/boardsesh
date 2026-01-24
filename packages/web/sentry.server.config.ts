// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only enable Sentry on production deployments to avoid polluting error tracking
const isProductionDomain = process.env.VERCEL_ENV === "production";

Sentry.init({
  dsn: "https://f55e6626faf787ae5291ad75b010ea14@o4510644927660032.ingest.us.sentry.io/4510644930150400",

  // Only send errors when running on boardsesh.com
  enabled: isProductionDomain,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
