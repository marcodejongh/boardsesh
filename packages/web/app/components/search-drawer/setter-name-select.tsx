'use client';

import React, { useState } from 'react';
import { Select } from 'antd';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import { useQueueContext } from '../graphql-queue';
import useSWR from 'swr';
import { constructSetterStatsUrl } from '@/app/lib/url-utils';

interface SetterStat {
  setter_username: string;
  climb_count: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MIN_SEARCH_LENGTH = 2; // Only search when user has typed at least 2 characters

const SetterNameSelect = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { parsedParams } = useQueueContext();
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch top setters when dropdown is open OR when user is searching
  const shouldFetch = isOpen || searchValue.length >= MIN_SEARCH_LENGTH;
  const isSearching = searchValue.length >= MIN_SEARCH_LENGTH;

  // Build API URL - with search query if searching, without if just showing top setters
  const apiUrl = shouldFetch
    ? constructSetterStatsUrl(parsedParams, isSearching ? searchValue : undefined)
    : null;

  // Fetch setter stats from the API
  const { data: setterStats, isLoading } = useSWR<SetterStat[]>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    }
  );

  // Map setter stats to Select options
  const options = React.useMemo(() => {
    if (!setterStats) return [];

    return setterStats.map(stat => ({
      value: stat.setter_username,
      label: `${stat.setter_username} (${stat.climb_count})`,
      count: stat.climb_count,
    }));
  }, [setterStats]);

  return (
    <Select
      mode="multiple"
      placeholder="Select setters..."
      value={uiSearchParams.settername}
      onChange={(value) => updateFilters({ settername: value })}
      onSearch={setSearchValue}
      onOpenChange={setIsOpen}
      loading={isLoading}
      showSearch
      filterOption={false} // Server-side filtering
      options={options}
      style={{ width: '100%' }}
      maxTagCount="responsive"
      notFoundContent={
        isLoading
          ? 'Loading...'
          : !isOpen && searchValue.length === 0
          ? 'Open dropdown to see setters'
          : 'No setters found'
      }
    />
  );
};

export default SetterNameSelect;
