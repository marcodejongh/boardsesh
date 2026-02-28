'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_SETTER_CLIMBS_FULL,
  type GetSetterClimbsFullQueryVariables,
  type GetSetterClimbsFullQueryResponse,
} from '@/app/lib/graphql/operations';
import { useMyBoards } from '@/app/hooks/use-my-boards';
import { useClimbActionsData } from '@/app/hooks/use-climb-actions-data';
import BoardScrollSection from '@/app/components/board-scroll/board-scroll-section';
import BoardScrollCard from '@/app/components/board-scroll/board-scroll-card';
import boardScrollStyles from '@/app/components/board-scroll/board-scroll.module.css';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { FavoritesProvider } from '@/app/components/climb-actions/favorites-batch-context';
import { PlaylistsProvider } from '@/app/components/climb-actions/playlists-batch-context';
import { getBoardDetailsForPlaylist, getDefaultAngleForBoard, getUserBoardDetails } from '@/app/lib/board-config-for-playlist';
import type { UserBoard } from '@boardsesh/shared-schema';
import type { Climb, BoardDetails } from '@/app/lib/types';

type SortBy = 'popular' | 'new';

interface SetterClimbListProps {
  username: string;
  boardTypes?: string[];
  authToken?: string | null;
}

export default function SetterClimbList({ username, boardTypes, authToken }: SetterClimbListProps) {
  const [selectedBoard, setSelectedBoard] = useState<UserBoard | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('popular');

  const { boards: myBoards, isLoading: isLoadingBoards } = useMyBoards(true);

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useInfiniteQuery({
    queryKey: ['setterClimbs', username, selectedBoard?.uuid ?? 'all', sortBy],
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(authToken ?? null);
      const variables: GetSetterClimbsFullQueryVariables = {
        input: {
          username,
          sortBy,
          limit: 20,
          offset: pageParam as number,
        },
      };

      if (selectedBoard) {
        variables.input.boardType = selectedBoard.boardType;
        variables.input.layoutId = selectedBoard.layoutId;
        variables.input.sizeId = selectedBoard.sizeId;
        variables.input.setIds = selectedBoard.setIds;
        variables.input.angle = selectedBoard.angle ?? getDefaultAngleForBoard(selectedBoard.boardType);
      }

      const response = await client.request<GetSetterClimbsFullQueryResponse, GetSetterClimbsFullQueryVariables>(
        GET_SETTER_CLIMBS_FULL,
        variables,
      );
      return response.setterClimbsFull;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage.hasMore) return undefined;
      return (lastPageParam as number) + lastPage.climbs.length;
    },
    staleTime: 60 * 1000,
  });

  const climbs: Climb[] = useMemo(
    () => data?.pages.flatMap((p) => p.climbs) ?? [],
    [data],
  );
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage]);

  const handleSortChange = (_: React.MouseEvent<HTMLElement>, value: SortBy | null) => {
    if (value) {
      setSortBy(value);
    }
  };

  const handleBoardSelect = (board: UserBoard) => {
    setSelectedBoard(board);
  };

  const handleAllSelect = () => {
    setSelectedBoard(null);
  };

  const navigateToClimb = useCallback(async (climb: Climb) => {
    try {
      const bt = climb.boardType || selectedBoard?.boardType;
      if (!bt) return;
      const params = new URLSearchParams({ boardType: bt, climbUuid: climb.uuid });
      const res = await fetch(`/api/internal/climb-redirect?${params}`);
      if (!res.ok) return;
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Failed to navigate to climb:', error);
    }
  }, [selectedBoard]);

  // Build boardDetailsMap for multi-board rendering
  const { boardDetailsMap, defaultBoardDetails, unsupportedClimbs } = useMemo(() => {
    const map: Record<string, BoardDetails> = {};
    const unsupported = new Set<string>();

    const userBoardsByKey = new Map<string, UserBoard>();
    for (const board of myBoards) {
      const key = `${board.boardType}:${board.layoutId}`;
      if (!userBoardsByKey.has(key)) {
        userBoardsByKey.set(key, board);
      }
    }

    for (const climb of climbs) {
      const bt = climb.boardType;
      const layoutId = climb.layoutId;
      if (!bt || layoutId == null) continue;

      const key = `${bt}:${layoutId}`;
      if (map[key]) continue;

      const userBoard = userBoardsByKey.get(key);
      if (userBoard) {
        const details = getUserBoardDetails(userBoard);
        if (details) {
          map[key] = details;
          continue;
        }
      }

      const genericDetails = getBoardDetailsForPlaylist(bt, layoutId);
      if (genericDetails) {
        map[key] = genericDetails;
      }
    }

    const userBoardTypes = new Set(myBoards.map((b) => b.boardType));
    for (const climb of climbs) {
      if (climb.boardType && !userBoardTypes.has(climb.boardType)) {
        unsupported.add(climb.uuid);
      }
    }

    let defaultDetails: BoardDetails | null = null;
    if (selectedBoard) {
      defaultDetails = getUserBoardDetails(selectedBoard);
    }
    if (!defaultDetails && myBoards.length > 0) {
      defaultDetails = getUserBoardDetails(myBoards[0]);
    }
    if (!defaultDetails) {
      defaultDetails = getBoardDetailsForPlaylist('kilter', 1);
    }

    return {
      boardDetailsMap: map,
      defaultBoardDetails: defaultDetails!,
      unsupportedClimbs: unsupported,
    };
  }, [climbs, myBoards, selectedBoard]);

  // Climb action data for favorites/playlists context
  const climbUuids = useMemo(() => climbs.map((c) => c.uuid), [climbs]);
  const actionsBoardName = selectedBoard?.boardType || (climbs[0]?.boardType ?? 'kilter');
  const actionsLayoutId = selectedBoard?.layoutId || (climbs[0]?.layoutId ?? 1);
  const actionsAngle = selectedBoard?.angle || getDefaultAngleForBoard(actionsBoardName);

  const { favoritesProviderProps, playlistsProviderProps } = useClimbActionsData({
    boardName: actionsBoardName,
    layoutId: actionsLayoutId,
    angle: actionsAngle,
    climbUuids,
  });

  // Header with sort toggle and count
  const headerInline = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={sortBy}
        onChange={handleSortChange}
      >
        <ToggleButton value="popular">Popular</ToggleButton>
        <ToggleButton value="new">New</ToggleButton>
      </ToggleButtonGroup>
      {totalCount > 0 && (
        <Typography variant="body2" color="text.secondary">
          {totalCount} climb{totalCount !== 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Board filter - thumbnail scroll cards */}
      {(myBoards.length > 0 || isLoadingBoards) && (
        <BoardScrollSection loading={isLoadingBoards} size="small">
          <div
            className={`${boardScrollStyles.cardScroll} ${boardScrollStyles.cardScrollSmall}`}
            onClick={handleAllSelect}
          >
            <div className={`${boardScrollStyles.cardSquare} ${boardScrollStyles.filterSquare} ${!selectedBoard ? boardScrollStyles.cardSquareSelected : ''}`}>
              <span className={boardScrollStyles.filterLabel}>All</span>
            </div>
            <div className={`${boardScrollStyles.cardName} ${!selectedBoard ? boardScrollStyles.cardNameSelected : ''}`}>
              All Boards
            </div>
          </div>
          {myBoards.map((board) => (
            <BoardScrollCard
              key={board.uuid}
              userBoard={board}
              size="small"
              selected={selectedBoard?.uuid === board.uuid}
              disabled={!boardTypes?.includes(board.boardType)}
              disabledText="No climbs"
              onClick={() => handleBoardSelect(board)}
            />
          ))}
        </BoardScrollSection>
      )}

      {isLoading && climbs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : climbs.length === 0 && !isLoading ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No climbs found
          </Typography>
        </Box>
      ) : defaultBoardDetails ? (
        <FavoritesProvider {...favoritesProviderProps}>
          <PlaylistsProvider {...playlistsProviderProps}>
            <ClimbsList
              boardDetails={defaultBoardDetails}
              boardDetailsMap={boardDetailsMap}
              unsupportedClimbs={unsupportedClimbs}
              climbs={climbs}
              isFetching={isFetching}
              hasMore={hasNextPage ?? false}
              onClimbSelect={navigateToClimb}
              onLoadMore={handleLoadMore}
              headerInline={headerInline}
              hideEndMessage
            />
          </PlaylistsProvider>
        </FavoritesProvider>
      ) : null}
    </Box>
  );
}
