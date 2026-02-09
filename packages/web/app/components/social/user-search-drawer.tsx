'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import UserSearchResults from './user-search-results';
import BoardSearchResults from './board-search-results';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';

type SearchType = 'boards' | 'climbers';

interface UserSearchDrawerProps {
  open: boolean;
  onClose: () => void;
  defaultSearchType?: SearchType;
}

export default function UserSearchDrawer({ open, onClose, defaultSearchType = 'boards' }: UserSearchDrawerProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>(defaultSearchType);
  const { token } = useWsAuthToken();

  const handleClose = () => {
    onClose();
    setQuery('');
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    setQuery('');
  };

  return (
    <SwipeableDrawer
      title="Search"
      placement="top"
      open={open}
      onClose={handleClose}
      styles={{
        wrapper: { height: '80vh' },
        body: { padding: 0 },
      }}
    >
      <Box sx={{ px: 2, pt: 1, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={searchType === 'boards' ? 'Search boards...' : 'Search climbers...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, px: 2, pb: 1 }}>
        <Chip
          label="Boards"
          variant={searchType === 'boards' ? 'filled' : 'outlined'}
          color={searchType === 'boards' ? 'primary' : 'default'}
          onClick={() => handleSearchTypeChange('boards')}
        />
        <Chip
          label="Climbers"
          variant={searchType === 'climbers' ? 'filled' : 'outlined'}
          color={searchType === 'climbers' ? 'primary' : 'default'}
          onClick={() => handleSearchTypeChange('climbers')}
        />
      </Box>
      {searchType === 'boards' ? (
        <BoardSearchResults query={query} authToken={token} />
      ) : (
        <UserSearchResults query={query} authToken={token} />
      )}
    </SwipeableDrawer>
  );
}
