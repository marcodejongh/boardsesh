'use client';

import React, { useState } from 'react';
import { Select } from 'antd';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import { useQueueContext } from '../queue-control/queue-context';
import useSWR from 'swr';
import { constructSetterStatsUrl } from '@/app/lib/url-utils';

interface SetterStat {
  setter_username: string;
  climb_count: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MIN_SEARCH_LENGTH = 2; // Only fetch when user has typed at least 2 characters

const SetterNameSelect = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { parsedParams } = useQueueContext();
  const [searchValue, setSearchValue] = useState('');

  // Only fetch when search value is long enough (lazy loading)
  const shouldFetch = searchValue.length >= MIN_SEARCH_LENGTH;
  const apiUrl = shouldFetch
    ? constructSetterStatsUrl(parsedParams, searchValue)
    : null;

  // Fetch setter stats from the API (only when shouldFetch is true)
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
      placeholder={`Type ${MIN_SEARCH_LENGTH}+ characters to search setters...`}
      value={uiSearchParams.settername}
      onChange={(value) => updateFilters({ settername: value })}
      onSearch={setSearchValue}
      loading={isLoading}
      showSearch
      filterOption={false} // Server-side filtering
      options={options}
      style={{ width: '100%' }}
      maxTagCount="responsive"
      notFoundContent={
        searchValue.length < MIN_SEARCH_LENGTH
          ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
          : isLoading
          ? 'Loading...'
          : 'No setters found'
      }
    />
  );
};

export default SetterNameSelect;
