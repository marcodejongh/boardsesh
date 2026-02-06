'use client';

import React, { useState } from 'react';
import { Button, Badge, Typography, Spin } from 'antd';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { SearchOutlined } from '@ant-design/icons';
import SearchForm from './search-form';
import { useQueueContext } from '@/app/components/graphql-queue';
import ClearButton from './clear-button';
import { BoardDetails } from '@/app/lib/types';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import { DEFAULT_SEARCH_PARAMS } from '@/app/lib/url-utils';
import styles from './search-form.module.css';

const { Text } = Typography;

const SearchButton = ({ boardDetails }: { boardDetails: BoardDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { totalSearchResultCount, isFetchingClimbs } = useQueueContext();
  const { uiSearchParams } = useUISearchParams();

  // TODO: Refactor and make this part of the UISearchParamsProvider
  const hasActiveFilters = Object.entries(uiSearchParams).some(([key, value]) => {
    if (key === 'holdsFilter') {
      // Check if holdsFilter has any entries
      return Object.keys(value || {}).length > 0;
    }
    return value !== DEFAULT_SEARCH_PARAMS[key as keyof typeof DEFAULT_SEARCH_PARAMS];
  });

  const drawerTitle = 'Search Climbs';

  const drawerFooter = (
    <div className={styles.searchFooter}>
      <div className={styles.resultCount}>
        {isFetchingClimbs ? (
          <Spin size="small" />
        ) : (
          <Text type="secondary">
            <span className={styles.resultBadge}>{(totalSearchResultCount ?? 0).toLocaleString()}</span> results
          </Text>
        )}
      </div>
      <ClearButton />
    </div>
  );

  return (
    <>
      <Badge
        count={hasActiveFilters ? totalSearchResultCount : 0}
        overflowCount={9999}
        showZero={hasActiveFilters}
        color="cyan"
        style={{ zIndex: 100 }}
      >
        <Button id="onboarding-search-button" type="default" icon={<SearchOutlined />} onClick={() => setIsOpen(true)} />
      </Badge>

      <SwipeableDrawer
        title={drawerTitle}
        placement="right"
        size="large"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        footer={hasActiveFilters ? drawerFooter : null}
        styles={{
          body: { padding: '12px 16px 16px' },
          footer: { padding: 0, border: 'none' },
          wrapper: { width: '90%' },
        }}
      >
        <SearchForm boardDetails={boardDetails} />
      </SwipeableDrawer>
    </>
  );
};

export default SearchButton;
