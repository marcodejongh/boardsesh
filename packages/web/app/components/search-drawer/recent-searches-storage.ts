import { SearchRequestPagination } from '@/app/lib/types';

export type RecentSearch = {
  id: string;
  label: string;
  filters: Partial<SearchRequestPagination>;
  timestamp: number;
};

export const RECENT_SEARCHES_CHANGED_EVENT = 'boardsesh:recent-searches-changed';
const STORAGE_KEY = 'boardsesh_recent_searches';
const MAX_ITEMS = 10;

export function getFilterKey(filters: Partial<SearchRequestPagination>): string {
  // Exclude page/pageSize from comparison since they're not meaningful for deduplication
  const { page: _page, pageSize: _pageSize, ...rest } = filters as SearchRequestPagination;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSearch[];
  } catch {
    return [];
  }
}

export function addRecentSearch(label: string, filters: Partial<SearchRequestPagination>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentSearches();
    const filterKey = getFilterKey(filters);

    // Remove duplicate if exists
    const deduplicated = existing.filter((s) => getFilterKey(s.filters) !== filterKey);

    const newEntry: RecentSearch = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label,
      filters,
      timestamp: Date.now(),
    };

    // Add to front, cap at MAX_ITEMS
    const updated = [newEntry, ...deduplicated].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_CHANGED_EVENT));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

