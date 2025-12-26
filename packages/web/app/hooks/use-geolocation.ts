'use client';

import { useState, useCallback, useEffect } from 'react';

export type GeolocationCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type GeolocationState = {
  coordinates: GeolocationCoordinates | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  permissionState: PermissionState | null;
};

export type UseGeolocationReturn = GeolocationState & {
  requestPermission: () => Promise<void>;
  refresh: () => Promise<void>;
};

const defaultOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // Cache position for 1 minute
};

/**
 * Custom hook for accessing browser geolocation.
 * @param options Position options for geolocation API
 */
export function useGeolocation(options: PositionOptions = defaultOptions): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    loading: false,
    permissionState: null,
  });

  // Check permission state on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return;
    }

    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setState((prev) => ({ ...prev, permissionState: result.state }));

      // Listen for permission changes
      result.addEventListener('change', () => {
        setState((prev) => ({ ...prev, permissionState: result.state }));
      });
    }).catch(() => {
      // Permission API not supported, that's okay
    });
  }, []);

  const getCurrentPosition = useCallback((): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }, [options]);

  const requestPermission = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const coords = await getCurrentPosition();
      setState((prev) => ({
        ...prev,
        coordinates: coords,
        loading: false,
        error: null,
        permissionState: 'granted',
      }));
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      setState((prev) => ({
        ...prev,
        coordinates: null,
        loading: false,
        error: geoError,
        permissionState: geoError.code === 1 ? 'denied' : prev.permissionState,
      }));
    }
  }, [getCurrentPosition]);

  const refresh = useCallback(async () => {
    if (state.permissionState !== 'granted') {
      return requestPermission();
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const coords = await getCurrentPosition();
      setState((prev) => ({
        ...prev,
        coordinates: coords,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error as GeolocationPositionError,
      }));
    }
  }, [state.permissionState, getCurrentPosition, requestPermission]);

  return {
    ...state,
    requestPermission,
    refresh,
  };
}

/**
 * Get a human-readable error message for geolocation errors.
 */
export function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission was denied. Please enable location access in your browser settings.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information is unavailable. Please try again later.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again.';
    default:
      return 'An unknown error occurred while getting your location.';
  }
}
