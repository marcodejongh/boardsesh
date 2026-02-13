'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import type { UserBoard } from '@boardsesh/shared-schema';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_MY_BOARDS,
  type GetMyBoardsQueryResponse,
} from '@/app/lib/graphql/operations';
import { themeTokens } from '@/app/theme/theme-config';

interface BoardSelectorPillsProps {
  mode?: 'navigate' | 'filter';
  onBoardSelect?: (board: UserBoard) => void;
  onBoardFilter?: (boardUuid: string | null) => void;
  includeAllPill?: boolean;
  /** Controlled selection from URL params. When provided, overrides internal state. */
  selectedBoardUuid?: string | null;
}

export default function BoardSelectorPills({
  mode = 'navigate',
  onBoardSelect,
  onBoardFilter,
  includeAllPill = false,
  selectedBoardUuid: controlledSelectedUuid,
}: BoardSelectorPillsProps) {
  const [boards, setBoards] = useState<UserBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalSelectedUuid, setInternalSelectedUuid] = useState<string | null>(null);
  const { token, isAuthenticated } = useWsAuthToken();

  // Use controlled value if provided, otherwise use internal state
  const selectedUuid = controlledSelectedUuid !== undefined ? controlledSelectedUuid : internalSelectedUuid;

  const fetchBoards = useCallback(async () => {
    if (!token) return;
    try {
      const client = createGraphQLHttpClient(token);
      const data = await client.request<GetMyBoardsQueryResponse>(GET_MY_BOARDS, {
        input: { limit: 20, offset: 0 },
      });
      setBoards(data.myBoards.boards);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchBoards();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, fetchBoards]);

  if (!isAuthenticated || (boards.length === 0 && !isLoading)) {
    return null;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  const handleSelect = (board: UserBoard) => {
    setInternalSelectedUuid(board.uuid);
    if (mode === 'filter') {
      onBoardFilter?.(board.uuid);
    } else {
      onBoardSelect?.(board);
    }
  };

  const handleAllClick = () => {
    setInternalSelectedUuid(null);
    onBoardFilter?.(null);
  };

  // In filter mode with no selection, "All" is selected
  const isAllSelected = mode === 'filter' && selectedUuid === null;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        py: 1,
        px: 0.5,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {mode === 'filter' && includeAllPill && (
        <Chip
          label="All"
          size="small"
          variant={isAllSelected ? 'filled' : 'outlined'}
          color={isAllSelected ? 'primary' : 'default'}
          onClick={handleAllClick}
          sx={{
            flexShrink: 0,
            fontWeight: isAllSelected
              ? themeTokens.typography.fontWeight.semibold
              : themeTokens.typography.fontWeight.normal,
          }}
        />
      )}
      {boards.map((board) => (
        <Chip
          key={board.uuid}
          label={board.name}
          size="small"
          variant={selectedUuid === board.uuid ? 'filled' : 'outlined'}
          color={selectedUuid === board.uuid ? 'primary' : 'default'}
          onClick={() => handleSelect(board)}
          sx={{
            flexShrink: 0,
            fontWeight: selectedUuid === board.uuid
              ? themeTokens.typography.fontWeight.semibold
              : themeTokens.typography.fontWeight.normal,
          }}
        />
      ))}
    </Box>
  );
}
