'use client';

import React, { useState } from 'react';
import { Select } from 'antd';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import useSWR from 'swr';
import { usePathname } from 'next/navigation';

interface SetterStat {
  setter_username: string;
  climb_count: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SetterNameSelect = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState('');

  // Extract board URL from pathname (e.g., /kilter/123/456/789/40/list -> /api/v1/kilter/123/456/789/40)
  const boardUrl = React.useMemo(() => {
    if (!pathname) return null;

    // Pattern: /[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/...
    const match = pathname.match(/^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const [, boardName, layoutId, sizeId, setIds, angle] = match;
    return `/api/v1/${boardName}/${layoutId}/${sizeId}/${setIds}/${angle}`;
  }, [pathname]);

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
