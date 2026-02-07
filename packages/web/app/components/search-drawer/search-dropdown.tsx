'use client';

import React, { useCallback } from 'react';
import { Button, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import AccordionSearchForm from './accordion-search-form';
import { BoardDetails } from '@/app/lib/types';
import { useQueueContext } from '@/app/components/graphql-queue';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { hasActiveFilters, getSearchPillSummary } from './search-summary-utils';
import { addRecentSearch } from './recent-searches-storage';
import styles from './search-dropdown.module.css';

interface SearchDropdownProps {
  boardDetails: BoardDetails;
  open: boolean;
  onClose: () => void;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({ boardDetails, open, onClose }) => {
  const { totalSearchResultCount, isFetchingClimbs } = useQueueContext();
  const { uiSearchParams, clearClimbSearchParams } = useUISearchParams();
  const filtersActive = hasActiveFilters(uiSearchParams);

  const handleClose = useCallback(() => {
    if (filtersActive) {
      const label = getSearchPillSummary(uiSearchParams);
      addRecentSearch(label, uiSearchParams);
    }
    onClose();
  }, [filtersActive, uiSearchParams, onClose]);

  const resultCount = totalSearchResultCount ?? 0;
  const showResultCount = filtersActive && !isFetchingClimbs && resultCount > 0;

  const drawerFooter = (
    <div className={styles.footer}>
      <button
        type="button"
        className={styles.clearAllButton}
        onClick={clearClimbSearchParams}
      >
        Clear all
      </button>
      <Button
        type="primary"
        icon={isFetchingClimbs ? <Spin size="small" /> : <SearchOutlined />}
        onClick={handleClose}
        className={styles.searchButton}
        size="large"
      >
        Search{showResultCount ? ` \u00B7 ${resultCount.toLocaleString()}` : ''}
      </Button>
    </div>
  );

  return (
    <SwipeableDrawer
      placement="top"
      open={open}
      onClose={handleClose}
      height="100%"
      showDragHandle
      closable={false}
      swipeEnabled
      footer={drawerFooter}
      rootClassName={styles.drawerRoot}
      styles={{
        body: { padding: '0 16px 16px', backgroundColor: 'var(--ant-color-bg-layout, #F3F4F6)' },
        footer: { padding: 0, border: 'none' },
        header: { display: 'none' },
        mask: { backgroundColor: 'rgba(128, 128, 128, 0.7)' },
      }}
    >
      <AccordionSearchForm boardDetails={boardDetails} />
    </SwipeableDrawer>
  );
};

export default SearchDropdown;
