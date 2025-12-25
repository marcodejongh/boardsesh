'use client';

import React, { useState } from 'react';
import { Button, Drawer, Badge, Typography, Spin, Space } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
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

  const drawerTitle = (
    <Space>
      <FilterOutlined style={{ color: '#06B6D4' }} />
      <span>Search Climbs</span>
    </Space>
  );

  const drawerFooter = (
    <div className={styles.searchFooter}>
      <div className={styles.resultCount}>
        {isFetchingClimbs ? (
          <Spin size="small" />
        ) : (
          <Space size={8}>
            <FilterOutlined style={{ color: '#06B6D4' }} />
            <Text type="secondary">
              <span className={styles.resultBadge}>{(totalSearchResultCount ?? 0).toLocaleString()}</span> results
            </Text>
          </Space>
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
        <Button type="default" icon={<SearchOutlined />} onClick={() => setIsOpen(true)} />
      </Badge>

      <Drawer
        title={drawerTitle}
        placement="right"
        width={'90%'}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        footer={hasActiveFilters ? drawerFooter : null}
        styles={{
          body: { padding: '12px 16px 16px' },
          footer: { padding: 0, border: 'none' },
        }}
      >
        <SearchForm boardDetails={boardDetails} />
      </Drawer>
    </>
  );
};

export default SearchButton;
