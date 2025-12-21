'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Custom hook to manage the Screen Wake Lock API.
 * Prevents the device from dimming or locking the screen while active.
 *
 * The wake lock is automatically re-acquired when the page becomes visible
 * after being hidden, as wake locks are released when the page is hidden.
 *
 * @param enabled - Whether the wake lock should be active
 * @returns Object containing the current state and manual control functions
 */
export function useWakeLock(enabled: boolean) {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Check if Wake Lock API is supported
  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  // Request wake lock
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      return;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);

      // Listen for release event (e.g., when page becomes hidden)
      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false);
      });
    } catch (err) {
      // Wake lock request can fail if:
      // - The document is not visible
      // - The device is low on battery
      // - The user has disabled wake locks
      console.warn('Wake Lock request failed:', err);
      setIsActive(false);
    }
  }, []);

  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
    }
  }, []);

  // Manage wake lock based on enabled state
  useEffect(() => {
    if (enabled && isSupported) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [enabled, isSupported, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when page becomes visible again
  // Wake locks are automatically released when the page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && isSupported) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isSupported, requestWakeLock]);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
  };
}
