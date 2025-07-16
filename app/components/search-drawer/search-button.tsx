'use client';

import React, { useState } from 'react';
import { Button, Drawer, Badge, Space, Typography, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import SearchForm from './search-form';
import { useQueueContext } from '@/app/components/queue-control/queue-context';
import ClearButton from './clear-button';
import { BoardDetails } from '@/app/lib/types';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import { DEFAULT_SEARCH_PARAMS } from '@/app/lib/url-utils';

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
        title="Search"
        placement="right"
        width={'90%'}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        footer={
          <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'left' }}>
              {isFetchingClimbs ? (
                <Spin size="small" />
              ) : (
                <Text type="secondary">Total Results: {totalSearchResultCount}</Text>
              )}
            </div>
            <ClearButton />
          </Space>
        }
      >
        <SearchForm boardDetails={boardDetails} />
      </Drawer>
    </>
  );
};

export default SearchButton;
