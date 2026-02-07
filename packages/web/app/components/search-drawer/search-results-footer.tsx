'use client';

import React from 'react';
import { Typography, Spin, Space } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useQueueContext } from '@/app/components/graphql-queue';
import ClearButton from './clear-button';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import { DEFAULT_SEARCH_PARAMS } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './search-form.module.css';

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
    <div className={styles.searchFooter}>
      <div className={styles.resultCount}>
        {isFetchingClimbs ? (
          <Spin size="small" />
        ) : (
          <Space size={8}>
            <FilterOutlined style={{ color: themeTokens.colors.primary }} />
            <Text type="secondary">
              <span className={styles.resultBadge}>{(totalSearchResultCount ?? 0).toLocaleString()}</span> results
            </Text>
          </Space>
        )}
      </div>
      <ClearButton />
    </div>
  );
};

export default SearchResultsFooter;