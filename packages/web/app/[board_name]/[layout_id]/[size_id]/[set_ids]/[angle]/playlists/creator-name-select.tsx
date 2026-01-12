'use client';

import React, { useState, useMemo } from 'react';
import { Select } from 'antd';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_PLAYLIST_CREATORS,
  GetPlaylistCreatorsQueryResponse,
  GetPlaylistCreatorsInput,
  PlaylistCreator,
} from '@/app/lib/graphql/operations/playlists';
import useSWR from 'swr';

interface CreatorNameSelectProps {
  boardType: string;
  layoutId: number;
  value: string[];
  onChange: (value: string[]) => void;
}

const MIN_SEARCH_LENGTH = 2;

const CreatorNameSelect = ({
  boardType,
  layoutId,
  value,
  onChange,
}: CreatorNameSelectProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch creators when dropdown is open OR when user is searching
  const shouldFetch = isOpen || searchValue.length >= MIN_SEARCH_LENGTH;
  const isSearching = searchValue.length >= MIN_SEARCH_LENGTH;

  // Fetcher function for SWR
  const fetcher = async (input: GetPlaylistCreatorsInput): Promise<PlaylistCreator[]> => {
    const response = await executeGraphQL<GetPlaylistCreatorsQueryResponse, { input: GetPlaylistCreatorsInput }>(
      GET_PLAYLIST_CREATORS,
      { input },
      undefined // No auth token needed for public discovery
    );
    return response.playlistCreators;
  };

  // Build the input for the query
  const queryInput: GetPlaylistCreatorsInput | null = shouldFetch
    ? {
        boardType,
        layoutId,
        searchQuery: isSearching ? searchValue : undefined,
      }
    : null;

  // Fetch creators
  const { data: creators, isLoading } = useSWR<PlaylistCreator[]>(
    queryInput ? ['playlistCreators', queryInput] : null,
    () => fetcher(queryInput!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    }
  );

  // Map creators to Select options
  const options = useMemo(() => {
    if (!creators) return [];

    return creators.map((creator) => ({
      value: creator.userId,
      label: `${creator.displayName} (${creator.playlistCount})`,
      count: creator.playlistCount,
    }));
  }, [creators]);

  return (
    <Select
      mode="multiple"
      placeholder="Select creators..."
      value={value}
      onChange={onChange}
      onSearch={setSearchValue}
      onOpenChange={setIsOpen}
      loading={isLoading}
      showSearch
      filterOption={false}
      options={options}
      style={{ width: '100%' }}
      maxTagCount="responsive"
      notFoundContent={
        isLoading
          ? 'Loading...'
          : !isOpen && searchValue.length === 0
            ? 'Open dropdown to see creators'
            : 'No creators found'
      }
    />
  );
};

export default CreatorNameSelect;
