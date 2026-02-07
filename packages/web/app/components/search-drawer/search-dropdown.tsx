'use client';

import React, { useCallback } from 'react';
import { Typography, Spin, Space, Badge } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import AccordionSearchForm from './accordion-search-form';
import ClearButton from './clear-button';
import { BoardDetails } from '@/app/lib/types';
import { useQueueContext } from '@/app/components/graphql-queue';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { hasActiveFilters, getSearchPillSummary } from './search-summary-utils';
import { addRecentSearch } from './recent-searches-storage';
import searchFormStyles from './search-form.module.css';

const { Text } = Typography;

interface SearchDropdownProps {
  boardDetails: BoardDetails;
  open: boolean;
  onClose: () => void;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({ boardDetails, open, onClose }) => {
  const { totalSearchResultCount, isFetchingClimbs } = useQueueContext();
  const { uiSearchParams } = useUISearchParams();
  const filtersActive = hasActiveFilters(uiSearchParams);

  const handleClose = useCallback(() => {
    // Save current filters as a recent search when closing if filters differ from defaults
    if (filtersActive) {
      const label = getSearchPillSummary(uiSearchParams);
      addRecentSearch(label, uiSearchParams);
    }
    onClose();
  }, [filtersActive, uiSearchParams, onClose]);

  const drawerTitle = (
    <Space size={8}>
      <span>Search Climbs</span>
      {filtersActive && !isFetchingClimbs && (
        <Badge
          count={totalSearchResultCount ?? 0}
          overflowCount={9999}
          showZero={false}
          color="cyan"
          size="small"
        />
      )}
    </Space>
  );

  const drawerFooter = filtersActive ? (
    <div className={searchFormStyles.searchFooter}>
      <div className={searchFormStyles.resultCount}>
        {isFetchingClimbs ? (
          <Spin size="small" />
        ) : (
          <Space size={8}>
            <FilterOutlined style={{ color: '#06B6D4' }} />
            <Text type="secondary">
              <span className={searchFormStyles.resultBadge}>
                {(totalSearchResultCount ?? 0).toLocaleString()}
              </span>{' '}
              results
            </Text>
          </Space>
        )}
      </div>
      <ClearButton />
    </div>
  ) : null;

  return (
    <SwipeableDrawer
      title={drawerTitle}
      placement="bottom"
      open={open}
      onClose={handleClose}
      height="85vh"
      showDragHandle
      footer={drawerFooter}
      styles={{
        body: { padding: '0 4px 16px' },
        footer: { padding: 0, border: 'none' },
      }}
    >
      <AccordionSearchForm boardDetails={boardDetails} />
    </SwipeableDrawer>
  );
};

export default SearchDropdown;
