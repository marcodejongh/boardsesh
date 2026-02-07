'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HistoryOutlined } from '@ant-design/icons';
import { getRecentSearches, RecentSearch } from './recent-searches-storage';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { SearchRequestPagination } from '@/app/lib/types';
import styles from './recent-search-pills.module.css';

const RecentSearchPills: React.FC = () => {
  const [searches, setSearches] = useState<RecentSearch[]>([]);
  const { updateFilters } = useUISearchParams();

  const refreshSearches = useCallback(() => {
    setSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    refreshSearches();

    // Listen for storage changes (when new searches are added from the drawer)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'boardsesh_recent_searches') {
        refreshSearches();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Also poll on focus to catch same-tab localStorage changes
    const handleFocus = () => refreshSearches();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSearches]);

  // Also refresh when the component re-renders (e.g. after drawer closes)
  useEffect(() => {
    refreshSearches();
  });

  if (searches.length === 0) return null;

  const handleApply = (filters: Partial<SearchRequestPagination>) => {
    updateFilters(filters);
  };

  return (
    <div className={styles.container}>
      <div className={styles.pillList}>
        {searches.map((search) => (
          <button
            key={search.id}
            type="button"
            className={styles.pill}
            onClick={() => handleApply(search.filters)}
            title={search.label}
          >
            <HistoryOutlined className={styles.pillIcon} />
            <span className={styles.pillLabel}>{search.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentSearchPills;
