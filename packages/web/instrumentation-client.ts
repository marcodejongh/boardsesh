// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { shouldFilterFromSentry } from "@/app/lib/websocket-errors";

// Only enable Sentry on boardsesh.com to avoid polluting error tracking
const isProductionDomain =
  typeof window !== "undefined" &&
  window.location.hostname.includes("boardsesh.com");

/**
 * Browser extension error patterns that should be filtered from Sentry.
 * These errors are caused by third-party browser extensions, not our code.
 */
const BROWSER_EXTENSION_PATTERNS = [
  "runtime.sendMessage",
  "Extension context invalidated",
  "message channel closed",
  "message port closed",
];

/**
 * Check if an error is from a browser extension
 */
function isBrowserExtensionError(message: string): boolean {
  return BROWSER_EXTENSION_PATTERNS.some((pattern) =>
    message.includes(pattern)
  );
}

Sentry.init({
  dsn: "https://f55e6626faf787ae5291ad75b010ea14@o4510644927660032.ingest.us.sentry.io/4510644930150400",

  // Only send errors when running on boardsesh.com
  enabled: isProductionDomain,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Filter out errors that aren't actionable
  beforeSend(event, hint) {
    const error = hint?.originalException;
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "");

    // Filter browser extension errors
    if (isBrowserExtensionError(errorMessage)) {
      return null;
    }

    // Filter known WebSocket/origin errors (uses shared module)
    if (errorMessage && shouldFilterFromSentry(errorMessage)) {
      console.warn(
        "[Sentry] Filtering known WebSocket/origin error:",
        errorMessage
      );
      return null;
    }

    // Also check exception values for WebSocket errors
    if (event.exception?.values) {
      for (const exception of event.exception.values) {
        if (exception.value && shouldFilterFromSentry(exception.value)) {
          console.warn(
            "[Sentry] Filtering known WebSocket/origin error:",
            exception.value
          );
          return null;
        }
      }
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
