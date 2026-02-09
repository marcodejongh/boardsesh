'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import UserSearchResults from './user-search-results';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';

interface UserSearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function UserSearchDrawer({ open, onClose }: UserSearchDrawerProps) {
  const [query, setQuery] = useState('');
  const { token } = useWsAuthToken();

  return (
    <SwipeableDrawer
      title="Find Climbers"
      placement="bottom"
      open={open}
      onClose={() => {
        onClose();
        setQuery('');
      }}
      styles={{
        wrapper: { height: '80vh' },
        body: { padding: 0 },
      }}
    >
      <Box sx={{ px: 2, pt: 1, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search users..."
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
      <UserSearchResults query={query} authToken={token} />
    </SwipeableDrawer>
  );
}
