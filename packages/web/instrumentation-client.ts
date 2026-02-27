// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only enable Sentry on boardsesh.com to avoid polluting error tracking
// Check hostname to ensure we don't send errors from localhost or preview deployments
const isProductionDomain =
  typeof window !== "undefined" &&
  window.location.hostname === "boardsesh.com";

Sentry.init({
  dsn: "https://f55e6626faf787ae5291ad75b010ea14@o4510644927660032.ingest.us.sentry.io/4510644930150400",

  // Only send errors when running on boardsesh.com
  enabled: isProductionDomain,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Filter out errors from browser extensions and third-party scripts
  beforeSend(event, hint) {
    const error = hint.originalException;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Ignore browser extension errors (runtime.sendMessage, etc.)
    if (
      errorMessage.includes("runtime.sendMessage") ||
      errorMessage.includes("Extension context invalidated") ||
      errorMessage.includes("message channel closed") ||
      errorMessage.includes("message port closed")
    ) {
      return null;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
