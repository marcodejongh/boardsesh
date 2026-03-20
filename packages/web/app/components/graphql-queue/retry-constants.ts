/** Initial delay before the first retry (milliseconds). */
export const INITIAL_RETRY_DELAY_MS = 1000;

/** Maximum delay between retries (milliseconds). */
export const MAX_RETRY_DELAY_MS = 30_000;

/** Multiplier applied to the delay after each successive retry. */
export const BACKOFF_MULTIPLIER = 2;

/** Maximum number of transient-join retries before treating as definitive failure. */
export const MAX_TRANSIENT_RETRIES = 5;
