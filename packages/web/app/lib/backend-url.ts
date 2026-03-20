/**
 * Runtime backend URL resolver.
 *
 * NEXT_PUBLIC_WS_URL is baked into the client bundle at build time by Next.js.
 * When a single Vercel deployment is served from multiple domains (e.g.,
 * pr-5.boardsesh.com internally and pr-5.preview.boardsesh.com externally),
 * the hard-coded value only works for one access path.
 *
 * This module resolves the correct WebSocket URL at runtime by inspecting
 * the current hostname, so every access path reaches the right backend.
 *
 * Resolution order:
 * 1. `backendUrl` URL search parameter (explicit override, useful for testing)
 * 2. Host-derived URL for PR preview domains
 * 3. NEXT_PUBLIC_WS_URL build-time fallback
 */

/**
 * Derive the WS backend URL from the current page hostname.
 *
 * Convention: for PR preview frontends the backend hostname mirrors the
 * frontend hostname with `-ws` appended to the PR label.
 *
 *   pr-5.boardsesh.com           → wss://pr-5-ws.boardsesh.com/graphql
 *   pr-5.preview.boardsesh.com   → wss://pr-5-ws.preview.boardsesh.com/graphql
 *
 * Returns null when the hostname doesn't match a known pattern (callers
 * should fall back to the build-time env var).
 */
function deriveWsUrlFromHost(hostname: string, secure: boolean): string | null {
  const protocol = secure ? 'wss' : 'ws';

  // Match {N}.preview.boardsesh.com → {N}.ws.preview.boardsesh.com
  const previewMatch = hostname.match(/^(\d+)\.preview\.boardsesh\.com$/);
  if (previewMatch) {
    return `${protocol}://${previewMatch[1]}.ws.preview.boardsesh.com/graphql`;
  }

  // Match pr-{N}.boardsesh.com or pr-{N}.{sub}.boardsesh.com
  const prMatch = hostname.match(/^(pr-\d+)\.(.+\.)?boardsesh\.com$/);
  if (prMatch) {
    const prLabel = prMatch[1]; // e.g. "pr-5"
    const rest = prMatch[2] ?? ''; // e.g. "preview." or ""
    return `${protocol}://${prLabel}-ws.${rest}boardsesh.com/graphql`;
  }

  return null;
}

/**
 * Resolve the backend WebSocket URL at runtime.
 *
 * Safe to call in any context (SSR, client, module scope in 'use client'
 * files). On the server side it returns the build-time env var directly.
 */
export function getBackendWsUrl(): string | null {
  // Server-side: env var is the only source of truth
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WS_URL || null;
  }

  // 1. Explicit override via query parameter
  try {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('backendUrl');
    if (override) return override;
  } catch {
    // URLSearchParams can throw in obscure environments; ignore
  }

  // 2. Host-derived URL for known domain patterns
  const derived = deriveWsUrlFromHost(
    window.location.hostname,
    window.location.protocol === 'https:',
  );
  if (derived) return derived;

  // 3. Build-time fallback
  return process.env.NEXT_PUBLIC_WS_URL || null;
}

/**
 * Convert a WebSocket URL to its HTTP equivalent.
 *   ws://  → http://
 *   wss:// → https://
 */
export function getGraphQLHttpUrl(): string {
  const wsUrl = getBackendWsUrl();
  if (!wsUrl) {
    throw new Error(
      'Backend WebSocket URL could not be determined. ' +
        'Set NEXT_PUBLIC_WS_URL or access the app from a known domain.',
    );
  }
  return wsUrl.replace(/^ws(s?):\/\//, 'http$1://');
}

/**
 * Get the backend base HTTP URL (without /graphql path).
 * Useful for REST-style endpoints like avatar upload.
 */
export function getBackendHttpUrl(): string | null {
  const wsUrl = getBackendWsUrl();
  if (!wsUrl) return null;

  try {
    const url = new URL(wsUrl);
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    url.pathname = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}
