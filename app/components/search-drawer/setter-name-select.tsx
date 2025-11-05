'use client';

import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import useSWR from 'swr';
import { useBoardDetailsContext } from '@/app/components/board-page/board-details-context';

interface SetterStat {
  setter_username: string;
  climb_count: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SetterNameSelect = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { boardUrl } = useBoardDetailsContext();
  const [searchValue, setSearchValue] = useState('');

  // Fetch setter stats from the API
  const { data: setterStats, isLoading } = useSWR<SetterStat[]>(
    boardUrl ? `${boardUrl}/setters` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Filter options based on search value
  const filteredOptions = React.useMemo(() => {
    if (!setterStats) return [];

    const lowerSearch = searchValue.toLowerCase();
    return setterStats
      .filter(stat => stat.setter_username.toLowerCase().includes(lowerSearch))
      .map(stat => ({
        value: stat.setter_username,
        label: `${stat.setter_username} (${stat.climb_count})`,
        count: stat.climb_count,
      }));
  }, [setterStats, searchValue]);

  return (
    <Select
      mode="multiple"
      placeholder="Select setters..."
      value={uiSearchParams.settername}
      onChange={(value) => updateFilters({ settername: value })}
      onSearch={setSearchValue}
      loading={isLoading}
      showSearch
      filterOption={false} // We handle filtering manually
      options={filteredOptions}
      style={{ width: '100%' }}
      maxTagCount="responsive"
    />
  );
};

export default SetterNameSelect;
