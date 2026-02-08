'use client';

import React, { useState, useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_PLAYLIST_CREATORS,
  GetPlaylistCreatorsQueryResponse,
  GetPlaylistCreatorsInput,
  PlaylistCreator,
} from '@/app/lib/graphql/operations/playlists';
import useSWR from 'swr';

interface CreatorOption {
  value: string;
  label: string;
  count: number;
}

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

  // Map creators to Autocomplete options
  const options: CreatorOption[] = useMemo(() => {
    if (!creators) return [];

    return creators.map((creator) => ({
      value: creator.userId,
      label: `${creator.displayName} (${creator.playlistCount})`,
      count: creator.playlistCount,
    }));
  }, [creators]);

  // Find the selected option objects from the value array
  const selectedOptions = useMemo(() => {
    return options.filter((option) => value.includes(option.value));
  }, [options, value]);

  return (
    <Autocomplete
      multiple
      limitTags={2}
      open={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      options={options}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, val) => option.value === val.value}
      value={selectedOptions}
      onChange={(_, newValue) => {
        onChange(newValue.map((opt) => opt.value));
      }}
      inputValue={searchValue}
      onInputChange={(_, newInputValue, reason) => {
        if (reason !== 'reset') {
          setSearchValue(newInputValue);
        }
      }}
      filterOptions={(x) => x}
      loading={isLoading}
      noOptionsText={
        isLoading
          ? 'Loading...'
          : !isOpen && searchValue.length === 0
            ? 'Open dropdown to see creators'
            : 'No creators found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder="Select creators..."
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      fullWidth
    />
  );
};

export default CreatorNameSelect;
