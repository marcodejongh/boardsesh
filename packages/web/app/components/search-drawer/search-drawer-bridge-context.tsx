'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useLayoutEffect, useEffect } from 'react';

// -------------------------------------------------------------------
// State context (consumed by GlobalHeader)
// -------------------------------------------------------------------

interface SearchDrawerBridgeState {
  /** Callback to open the climb search drawer. null when no board list page is active. */
  openClimbSearchDrawer: (() => void) | null;
  /** Filter summary text like "V5-V7 · Tall" or "Search climbs..." */
  searchPillSummary: string | null;
  /** Whether any climb filters are active (for indicator dot). */
  hasActiveFilters: boolean;
}

const SearchDrawerBridgeContext = createContext<SearchDrawerBridgeState>({
  openClimbSearchDrawer: null,
  searchPillSummary: null,
  hasActiveFilters: false,
});

export function useSearchDrawerBridge() {
  return useContext(SearchDrawerBridgeContext);
}

// -------------------------------------------------------------------
// Setter context (consumed by the injector in BoardSeshHeader)
// -------------------------------------------------------------------

interface SearchDrawerBridgeSetters {
  register: (openDrawer: () => void, summary: string, active: boolean) => void;
  update: (summary: string, active: boolean) => void;
  deregister: () => void;
}

const SearchDrawerBridgeSetterContext = createContext<SearchDrawerBridgeSetters>({
  register: () => {},
  update: () => {},
  deregister: () => {},
});

// -------------------------------------------------------------------
// Provider (placed at root level in PersistentSessionWrapper)
// -------------------------------------------------------------------

export function SearchDrawerBridgeProvider({ children }: { children: React.ReactNode }) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const openDrawerRef = useRef<(() => void) | null>(null);

  const register = useCallback((openDrawer: () => void, s: string, a: boolean) => {
    openDrawerRef.current = openDrawer;
    setSummary(s);
    setActive(a);
    setIsRegistered(true);
  }, []);

  const update = useCallback((s: string, a: boolean) => {
    setSummary(s);
    setActive(a);
  }, []);

  const deregister = useCallback(() => {
    openDrawerRef.current = null;
    setIsRegistered(false);
    setSummary(null);
    setActive(false);
  }, []);

  const stableOpenDrawer = useCallback(() => {
    openDrawerRef.current?.();
  }, []);

  const state = useMemo<SearchDrawerBridgeState>(() => ({
    openClimbSearchDrawer: isRegistered ? stableOpenDrawer : null,
    searchPillSummary: summary,
    hasActiveFilters: active,
  }), [isRegistered, stableOpenDrawer, summary, active]);

  const setters = useMemo<SearchDrawerBridgeSetters>(
    () => ({ register, update, deregister }),
    [register, update, deregister],
  );

  return (
    <SearchDrawerBridgeSetterContext.Provider value={setters}>
      <SearchDrawerBridgeContext.Provider value={state}>
        {children}
      </SearchDrawerBridgeContext.Provider>
    </SearchDrawerBridgeSetterContext.Provider>
  );
}

// -------------------------------------------------------------------
// Injector (placed inside BoardSeshHeader on list pages)
// -------------------------------------------------------------------

interface SearchDrawerBridgeInjectorProps {
  openDrawer: () => void;
  summary: string;
  hasActiveFilters: boolean;
  isOnListPage: boolean;
}

export function SearchDrawerBridgeInjector({
  openDrawer,
  summary,
  hasActiveFilters: active,
  isOnListPage,
}: SearchDrawerBridgeInjectorProps) {
  const { register, update, deregister } = useContext(SearchDrawerBridgeSetterContext);
  const hasRegisteredRef = useRef(false);

  // Register/deregister based on whether we're on the list page
  useLayoutEffect(() => {
    if (isOnListPage) {
      register(openDrawer, summary, active);
      hasRegisteredRef.current = true;
    } else if (hasRegisteredRef.current) {
      deregister();
      hasRegisteredRef.current = false;
    }

    return () => {
      if (hasRegisteredRef.current) {
        deregister();
        hasRegisteredRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnListPage, register, deregister]);

  // Update summary and active filters when they change (while on list page)
  useEffect(() => {
    if (hasRegisteredRef.current && isOnListPage) {
      update(summary, active);
    }
  }, [summary, active, isOnListPage, update]);

  // Update the openDrawer ref when the callback changes
  useEffect(() => {
    if (hasRegisteredRef.current && isOnListPage) {
      register(openDrawer, summary, active);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDrawer]);

  return null;
}
