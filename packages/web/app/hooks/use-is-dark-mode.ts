'use client';

import { useColorMode } from '@/app/hooks/use-color-mode';

/**
 * Convenience hook that returns whether the app is in dark mode.
 * Wraps useColorMode to avoid repeating `mode === 'dark'` everywhere.
 */
export function useIsDarkMode(): boolean {
  const { mode } = useColorMode();
  return mode === 'dark';
}
