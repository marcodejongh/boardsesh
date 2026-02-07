'use client';

import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { HistoryOutlined, CloseOutlined } from '@ant-design/icons';
import { getRecentSearches, removeRecentSearch, RecentSearch } from './recent-searches-storage';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { SearchRequestPagination } from '@/app/lib/types';
import styles from './recent-searches-list.module.css';

const RecentSearchesList: React.FC = () => {
  const [searches, setSearches] = useState<RecentSearch[]>([]);
  const { updateFilters } = useUISearchParams();

  useEffect(() => {
    setSearches(getRecentSearches());
  }, []);

  if (searches.length === 0) return null;

  const handleApply = (filters: Partial<SearchRequestPagination>) => {
    updateFilters(filters);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeRecentSearch(id);
    setSearches(getRecentSearches());
  };

  return (
    <div className={styles.list}>
      {searches.map((search) => (
        <div
          key={search.id}
          className={styles.item}
          onClick={() => handleApply(search.filters)}
        >
          <HistoryOutlined className={styles.icon} />
          <span className={styles.label}>{search.label}</span>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            className={styles.deleteButton}
            onClick={(e) => handleDelete(e, search.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default RecentSearchesList;
