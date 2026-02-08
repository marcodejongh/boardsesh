'use client';

import React from 'react';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { getSearchPillSummary, hasActiveFilters } from './search-summary-utils';
import styles from './search-pill.module.css';

interface SearchPillProps {
  onClick: () => void;
}

const SearchPill: React.FC<SearchPillProps> = ({ onClick }) => {
  const { uiSearchParams } = useUISearchParams();
  const summary = getSearchPillSummary(uiSearchParams);
  const filtersActive = hasActiveFilters(uiSearchParams);

  return (
    <button
      id="onboarding-search-button"
      className={styles.pill}
      onClick={onClick}
      type="button"
    >
      <SearchOutlined className={styles.icon} />
      <span className={styles.text}>{summary}</span>
      {filtersActive && <span className={styles.activeIndicator} />}
    </button>
  );
};

export default SearchPill;
