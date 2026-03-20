'use client';

import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the provided value.
 * The returned value only updates after the specified delay
 * has elapsed since the last change to the input value.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
