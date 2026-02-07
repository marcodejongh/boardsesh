'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HistoryOutlined } from '@ant-design/icons';
import { getRecentSearches, getFilterKey, RecentSearch, RECENT_SEARCHES_CHANGED_EVENT } from './recent-searches-storage';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { SearchRequestPagination } from '@/app/lib/types';
import styles from './recent-search-pills.module.css';

const RecentSearchPills: React.FC = () => {
  const [searches, setSearches] = useState<RecentSearch[]>([]);
  const { uiSearchParams, updateFilters } = useUISearchParams();

  const currentFilterKey = getFilterKey(uiSearchParams);

  const refreshSearches = useCallback(() => {
    setSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    refreshSearches();

    const handleChange = () => refreshSearches();
    window.addEventListener(RECENT_SEARCHES_CHANGED_EVENT, handleChange);

    return () => {
      window.removeEventListener(RECENT_SEARCHES_CHANGED_EVENT, handleChange);
    };
  }, [refreshSearches]);

  if (searches.length === 0) return null;

  const handleApply = (filters: Partial<SearchRequestPagination>) => {
    updateFilters(filters);
  };

  return (
    <div className={styles.container}>
      <div className={styles.pillList}>
        {searches.map((search) => {
          const isActive = getFilterKey(search.filters) === currentFilterKey;
          return (
            <button
              key={search.id}
              type="button"
              className={`${styles.pill} ${isActive ? styles.pillActive : ''}`}
              onClick={() => handleApply(search.filters)}
              title={search.label}
            >
              <HistoryOutlined className={styles.pillIcon} />
              <span className={styles.pillLabel}>{search.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentSearchPills;
