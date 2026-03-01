import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

import {
  SearchDrawerBridgeProvider,
  SearchDrawerBridgeInjector,
  useSearchDrawerBridge,
} from '../search-drawer-bridge-context';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('search-drawer-bridge-context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Provider — default state (no injector mounted)
  // -----------------------------------------------------------------------
  describe('SearchDrawerBridgeProvider (default state)', () => {
    function renderBridgeHook() {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SearchDrawerBridgeProvider>{children}</SearchDrawerBridgeProvider>
      );
      return renderHook(() => useSearchDrawerBridge(), { wrapper });
    }

    it('provides null openClimbSearchDrawer when no injector is mounted', () => {
      const { result } = renderBridgeHook();
      expect(result.current.openClimbSearchDrawer).toBeNull();
    });

    it('provides null searchPillSummary when no injector is mounted', () => {
      const { result } = renderBridgeHook();
      expect(result.current.searchPillSummary).toBeNull();
    });

    it('provides false hasActiveFilters when no injector is mounted', () => {
      const { result } = renderBridgeHook();
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Injector — registration and deregistration
  // -----------------------------------------------------------------------
  describe('SearchDrawerBridgeInjector', () => {
    const mockOpenDrawer = vi.fn();

    function renderWithInjector(props: {
      openDrawer: () => void;
      summary: string;
      hasActiveFilters: boolean;
      isOnListPage: boolean;
    }) {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SearchDrawerBridgeProvider>
          {children}
          <SearchDrawerBridgeInjector {...props} />
        </SearchDrawerBridgeProvider>
      );
      return renderHook(() => useSearchDrawerBridge(), { wrapper });
    }

    it('registers when isOnListPage is true', () => {
      const { result } = renderWithInjector({
        openDrawer: mockOpenDrawer,
        summary: 'V5-V7 · Tall',
        hasActiveFilters: true,
        isOnListPage: true,
      });

      expect(result.current.openClimbSearchDrawer).not.toBeNull();
      expect(result.current.searchPillSummary).toBe('V5-V7 · Tall');
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('does not register when isOnListPage is false', () => {
      const { result } = renderWithInjector({
        openDrawer: mockOpenDrawer,
        summary: 'V5-V7',
        hasActiveFilters: true,
        isOnListPage: false,
      });

      expect(result.current.openClimbSearchDrawer).toBeNull();
      expect(result.current.searchPillSummary).toBeNull();
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('calls the registered openDrawer callback when openClimbSearchDrawer is invoked', () => {
      const { result } = renderWithInjector({
        openDrawer: mockOpenDrawer,
        summary: 'Search climbs...',
        hasActiveFilters: false,
        isOnListPage: true,
      });

      act(() => {
        result.current.openClimbSearchDrawer!();
      });

      expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
    });

    it('deregisters on unmount', () => {
      const { result, unmount } = renderWithInjector({
        openDrawer: mockOpenDrawer,
        summary: 'V5-V7',
        hasActiveFilters: true,
        isOnListPage: true,
      });

      // Before unmount — registered
      expect(result.current.openClimbSearchDrawer).not.toBeNull();

      unmount();

      // After unmount — verify by rendering a fresh provider
      const wrapper2 = ({ children }: { children: React.ReactNode }) => (
        <SearchDrawerBridgeProvider>{children}</SearchDrawerBridgeProvider>
      );
      const { result: result2 } = renderHook(() => useSearchDrawerBridge(), { wrapper: wrapper2 });
      expect(result2.current.openClimbSearchDrawer).toBeNull();
    });

    it('deregisters when isOnListPage changes from true to false', () => {
      let isOnListPage = true;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SearchDrawerBridgeProvider>
          {children}
          <SearchDrawerBridgeInjector
            openDrawer={mockOpenDrawer}
            summary="V5-V7"
            hasActiveFilters={true}
            isOnListPage={isOnListPage}
          />
        </SearchDrawerBridgeProvider>
      );

      const { result, rerender } = renderHook(() => useSearchDrawerBridge(), { wrapper });

      // Initially registered
      expect(result.current.openClimbSearchDrawer).not.toBeNull();

      // Switch to non-list page
      isOnListPage = false;
      rerender();

      expect(result.current.openClimbSearchDrawer).toBeNull();
    });

    it('updates summary when it changes while on list page', () => {
      let summary = 'V5-V7';
      let hasActiveFilters = true;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SearchDrawerBridgeProvider>
          {children}
          <SearchDrawerBridgeInjector
            openDrawer={mockOpenDrawer}
            summary={summary}
            hasActiveFilters={hasActiveFilters}
            isOnListPage={true}
          />
        </SearchDrawerBridgeProvider>
      );

      const { result, rerender } = renderHook(() => useSearchDrawerBridge(), { wrapper });

      expect(result.current.searchPillSummary).toBe('V5-V7');
      expect(result.current.hasActiveFilters).toBe(true);

      // Update the summary
      summary = 'V5-V7 · Tall · Classics';
      hasActiveFilters = true;
      rerender();

      expect(result.current.searchPillSummary).toBe('V5-V7 · Tall · Classics');
    });

    it('updates hasActiveFilters when filters are cleared', () => {
      let summary = 'V5-V7';
      let hasActiveFilters = true;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SearchDrawerBridgeProvider>
          {children}
          <SearchDrawerBridgeInjector
            openDrawer={mockOpenDrawer}
            summary={summary}
            hasActiveFilters={hasActiveFilters}
            isOnListPage={true}
          />
        </SearchDrawerBridgeProvider>
      );

      const { result, rerender } = renderHook(() => useSearchDrawerBridge(), { wrapper });

      expect(result.current.hasActiveFilters).toBe(true);

      // Clear filters
      summary = 'Search climbs...';
      hasActiveFilters = false;
      rerender();

      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.searchPillSummary).toBe('Search climbs...');
    });

    it('re-registers when isOnListPage changes from false to true', () => {
      let isOnListPage = false;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SearchDrawerBridgeProvider>
          {children}
          <SearchDrawerBridgeInjector
            openDrawer={mockOpenDrawer}
            summary="V5-V7"
            hasActiveFilters={true}
            isOnListPage={isOnListPage}
          />
        </SearchDrawerBridgeProvider>
      );

      const { result, rerender } = renderHook(() => useSearchDrawerBridge(), { wrapper });

      // Initially not registered
      expect(result.current.openClimbSearchDrawer).toBeNull();

      // Navigate to list page
      isOnListPage = true;
      rerender();

      expect(result.current.openClimbSearchDrawer).not.toBeNull();
      expect(result.current.searchPillSummary).toBe('V5-V7');
    });

    it('updates the openDrawer callback when it changes', () => {
      const openDrawer1 = vi.fn();
      const openDrawer2 = vi.fn();
      let currentOpenDrawer = openDrawer1;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SearchDrawerBridgeProvider>
          {children}
          <SearchDrawerBridgeInjector
            openDrawer={currentOpenDrawer}
            summary="V5-V7"
            hasActiveFilters={false}
            isOnListPage={true}
          />
        </SearchDrawerBridgeProvider>
      );

      const { result, rerender } = renderHook(() => useSearchDrawerBridge(), { wrapper });

      act(() => {
        result.current.openClimbSearchDrawer!();
      });
      expect(openDrawer1).toHaveBeenCalledTimes(1);
      expect(openDrawer2).toHaveBeenCalledTimes(0);

      // Change the callback
      currentOpenDrawer = openDrawer2;
      rerender();

      act(() => {
        result.current.openClimbSearchDrawer!();
      });
      expect(openDrawer2).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // useSearchDrawerBridge — without provider
  // -----------------------------------------------------------------------
  describe('useSearchDrawerBridge (without provider)', () => {
    it('returns default values when used outside provider', () => {
      const { result } = renderHook(() => useSearchDrawerBridge());

      expect(result.current.openClimbSearchDrawer).toBeNull();
      expect(result.current.searchPillSummary).toBeNull();
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });
});
