'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_SETTER_CLIMBS,
  type GetSetterClimbsQueryVariables,
  type GetSetterClimbsQueryResponse,
} from '@/app/lib/graphql/operations';
import type { SetterClimb } from '@boardsesh/shared-schema';

interface SetterClimbListProps {
  username: string;
  boardTypes?: string[];
  authToken?: string | null;
}

export default function SetterClimbList({ username, boardTypes, authToken }: SetterClimbListProps) {
  const [climbs, setClimbs] = useState<SetterClimb[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedBoard, setSelectedBoard] = useState<string | undefined>(undefined);

  const fetchClimbs = useCallback(async (offset = 0, boardType?: string) => {
    setLoading(true);
    try {
      const client = createGraphQLHttpClient(authToken ?? null);
      const response = await client.request<GetSetterClimbsQueryResponse, GetSetterClimbsQueryVariables>(
        GET_SETTER_CLIMBS,
        { input: { username, boardType, limit: 20, offset } }
      );

      if (offset === 0) {
        setClimbs(response.setterClimbs.climbs);
      } else {
        setClimbs((prev) => [...prev, ...response.setterClimbs.climbs]);
      }
      setHasMore(response.setterClimbs.hasMore);
      setTotalCount(response.setterClimbs.totalCount);
    } catch (error) {
      console.error('Failed to fetch setter climbs:', error);
    } finally {
      setLoading(false);
    }
  }, [username, authToken]);

  useEffect(() => {
    fetchClimbs(0, selectedBoard);
  }, [fetchClimbs, selectedBoard]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchClimbs(climbs.length, selectedBoard);
    }
  };

  const handleBoardChange = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    setSelectedBoard(value ?? undefined);
  };

  const navigateToClimb = useCallback(async (climb: SetterClimb) => {
    try {
      const params = new URLSearchParams({ boardType: climb.boardType, climbUuid: climb.uuid });
      const res = await fetch(`/api/internal/climb-redirect?${params}`);
      if (!res.ok) return;
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      // Silently fail navigation
    }
  }, []);

  return (
    <Box>
      {/* Board type filter */}
      {boardTypes && boardTypes.length > 1 && (
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={selectedBoard ?? null}
            onChange={handleBoardChange}
          >
            <ToggleButton value={null as unknown as string}>All</ToggleButton>
            {boardTypes.map((bt) => (
              <ToggleButton key={bt} value={bt}>
                {bt.charAt(0).toUpperCase() + bt.slice(1)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {loading && climbs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : climbs.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No climbs found
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {totalCount} climb{totalCount !== 1 ? 's' : ''}
          </Typography>
          <List disablePadding>
            {climbs.map((climb) => (
              <ListItem
                key={`${climb.boardType}-${climb.uuid}`}
                onClick={() => navigateToClimb(climb)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                  borderBottom: '1px solid var(--neutral-200)',
                  py: 1.5,
                  px: 0,
                }}
              >
                <ListItemText
                  primary={climb.name || 'Unnamed'}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                      <Chip
                        label={climb.boardType.charAt(0).toUpperCase() + climb.boardType.slice(1)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      {climb.difficultyName && (
                        <Typography variant="caption" component="span" color="text.secondary">
                          {climb.difficultyName}
                        </Typography>
                      )}
                      {climb.angle != null && (
                        <Typography variant="caption" component="span" color="text.secondary">
                          {climb.angle}&deg;
                        </Typography>
                      )}
                      {climb.ascensionistCount != null && climb.ascensionistCount > 0 && (
                        <Typography variant="caption" component="span" color="text.secondary">
                          {climb.ascensionistCount} ascent{climb.ascensionistCount !== 1 ? 's' : ''}
                        </Typography>
                      )}
                      {climb.qualityAverage != null && climb.qualityAverage > 0 && (
                        <Typography variant="caption" component="span" color="text.secondary">
                          {'★'.repeat(Math.round(climb.qualityAverage))}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          {hasMore && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <MuiButton
                onClick={handleLoadMore}
                disabled={loading}
                variant="outlined"
                fullWidth
              >
                {loading ? 'Loading...' : `Load more (${climbs.length} of ${totalCount})`}
              </MuiButton>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
