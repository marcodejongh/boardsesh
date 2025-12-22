'use client';

import React from 'react';
import { Space, Typography, Spin } from 'antd';
import { useQueueContext } from '@/app/components/graphql-queue';
import ClearButton from './clear-button';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import { DEFAULT_SEARCH_PARAMS } from '@/app/lib/url-utils';

const { Text } = Typography;

const SearchResultsFooter = () => {
  const { totalSearchResultCount, isFetchingClimbs } = useQueueContext();
  const { uiSearchParams } = useUISearchParams();

  // Check if any filters are active
  const hasActiveFilters = Object.entries(uiSearchParams).some(([key, value]) => {
    if (key === 'holdsFilter') {
      // Check if holdsFilter has any entries
      return Object.keys(value || {}).length > 0;
    }
    return value !== DEFAULT_SEARCH_PARAMS[key as keyof typeof DEFAULT_SEARCH_PARAMS];
  });

  // Only show footer when filters are active
  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', backgroundColor: 'white' }}>
      <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ textAlign: 'left' }}>
          {isFetchingClimbs ? (
            <Spin size="small" />
          ) : (
            <Text type="secondary">Total Results: {totalSearchResultCount}</Text>
          )}
        </div>
        <ClearButton />
      </Space>
    </div>
  );
};

export default SearchResultsFooter;