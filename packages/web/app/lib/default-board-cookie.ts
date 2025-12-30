// Cookie utilities for default board configuration
// Using a simple cookie (not iron-session) since we just store a URL path

export const DEFAULT_BOARD_COOKIE_NAME = 'default_board_url';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

/**
 * Set the default board URL cookie (client-side)
 */
export function setDefaultBoardCookie(url: string): void {
  document.cookie = `${DEFAULT_BOARD_COOKIE_NAME}=${encodeURIComponent(url)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Clear the default board URL cookie (client-side)
 */
export function clearDefaultBoardCookie(): void {
  document.cookie = `${DEFAULT_BOARD_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Get the default board URL from cookie (client-side)
 */
export function getDefaultBoardCookieClient(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === DEFAULT_BOARD_COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
