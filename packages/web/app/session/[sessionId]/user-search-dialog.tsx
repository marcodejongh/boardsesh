'use client';

import React, { useState, useCallback, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import {
  SEARCH_USERS,
  type SearchUsersQueryVariables,
  type SearchUsersQueryResponse,
} from '@/app/lib/graphql/operations/social';

interface UserSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  excludeUserIds?: string[];
}

interface SearchResult {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export default function UserSearchDialog({
  open,
  onClose,
  onSelectUser,
  excludeUserIds = [],
}: UserSearchDialogProps) {
  const { token: authToken } = useWsAuthToken();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const client = createGraphQLHttpClient(authToken);
          const response = await client.request<SearchUsersQueryResponse, SearchUsersQueryVariables>(
            SEARCH_USERS,
            { input: { query: searchQuery.trim(), limit: 10 } },
          );

          const filtered = response.searchUsers.results
            .map((r) => ({
              id: r.user.id,
              displayName: r.user.displayName ?? null,
              avatarUrl: r.user.avatarUrl ?? null,
            }))
            .filter((u) => !excludeUserIds.includes(u.id));

          setResults(filtered);
        } catch (err) {
          console.error('User search failed:', err);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [authToken, excludeUserIds],
  );

  const handleSelect = useCallback(
    (userId: string) => {
      setQuery('');
      setResults([]);
      onSelectUser(userId);
    },
    [onSelectUser],
  );

  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Add Climber</DialogTitle>
      <DialogContent>
        <TextField
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name..."
          size="small"
          fullWidth
          autoFocus
          sx={{ mb: 1 }}
        />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!loading && results.length === 0 && query.trim().length >= 2 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No users found
          </Typography>
        )}

        {results.length > 0 && (
          <List disablePadding>
            {results.map((user) => (
              <ListItemButton key={user.id} onClick={() => handleSelect(user.id)}>
                <ListItemAvatar>
                  <Avatar src={user.avatarUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                    {!user.avatarUrl && <PersonOutlined sx={{ fontSize: 16 }} />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.displayName || 'Climber'}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
