'use client';

import React, { useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { useMyBoards } from '@/app/hooks/use-my-boards';
import { useBoardDetailsMap } from '@/app/hooks/use-board-details-map';
import { useClimbActionsData } from '@/app/hooks/use-climb-actions-data';
import BoardScrollSection from '@/app/components/board-scroll/board-scroll-section';
import BoardScrollCard from '@/app/components/board-scroll/board-scroll-card';
import boardScrollStyles from '@/app/components/board-scroll/board-scroll.module.css';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { FavoritesProvider } from '@/app/components/climb-actions/favorites-batch-context';
import { PlaylistsProvider } from '@/app/components/climb-actions/playlists-batch-context';
import { getDefaultAngleForBoard } from '@/app/lib/board-config-for-playlist';
import type { UserBoard } from '@boardsesh/shared-schema';
import type { Climb } from '@/app/lib/types';

export type SortBy = 'popular' | 'new';

interface MultiboardClimbListProps {
  climbs: Climb[];
  isFetching: boolean;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  // Board filter
  showBoardFilter?: boolean;
  /** Board types present in the climbs (used for disabling filter cards) */
  boardTypes?: string[];
  selectedBoard: UserBoard | null;
  onBoardSelect: (board: UserBoard | null) => void;
  // Sort toggle
  showSortToggle?: boolean;
  sortBy?: SortBy;
  onSortChange?: (sortBy: SortBy) => void;
  totalCount?: number;
  // Climb interaction
  onClimbSelect?: (climb: Climb) => void;
  selectedClimbUuid?: string | null;
  // Optional header content
  header?: React.ReactNode;
  hideEndMessage?: boolean;
  showBottomSpacer?: boolean;
  /** Fallback board types for default board details resolution */
  fallbackBoardTypes?: string[];
}

export default function MultiboardClimbList({
  climbs,
  isFetching,
  isLoading,
  hasMore,
  onLoadMore,
  showBoardFilter = true,
  boardTypes,
  selectedBoard,
  onBoardSelect,
  showSortToggle = false,
  sortBy = 'popular',
  onSortChange,
  totalCount,
  onClimbSelect,
  selectedClimbUuid,
  header,
  hideEndMessage = true,
  showBottomSpacer = true,
  fallbackBoardTypes,
}: MultiboardClimbListProps) {
  const { boards: myBoards, isLoading: isLoadingBoards } = useMyBoards(true);

  const { boardDetailsMap, defaultBoardDetails, unsupportedClimbs } = useBoardDetailsMap(
    climbs,
    myBoards,
    selectedBoard,
    fallbackBoardTypes,
  );

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

  // Default climb navigation via redirect API
  const defaultNavigateToClimb = useCallback(async (climb: Climb) => {
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

  const handleClimbSelect = onClimbSelect ?? defaultNavigateToClimb;

  const handleSortChange = (_: React.MouseEvent<HTMLElement>, value: SortBy | null) => {
    if (value && onSortChange) {
      onSortChange(value);
    }
  };

  // Header with sort toggle and count
  const headerInline = showSortToggle ? (
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
      {totalCount != null && totalCount > 0 && (
        <Typography variant="body2" color="text.secondary">
          {totalCount} climb{totalCount !== 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  ) : undefined;

  return (
    <Box>
      {/* Board filter - thumbnail scroll cards */}
      {showBoardFilter && (myBoards.length > 0 || isLoadingBoards) && (
        <BoardScrollSection loading={isLoadingBoards} size="small">
          <div
            className={`${boardScrollStyles.cardScroll} ${boardScrollStyles.cardScrollSmall}`}
            onClick={() => onBoardSelect(null)}
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
              disabled={boardTypes ? !boardTypes.includes(board.boardType) : false}
              disabledText="No climbs"
              onClick={() => onBoardSelect(board)}
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
              selectedClimbUuid={selectedClimbUuid}
              isFetching={isFetching}
              hasMore={hasMore}
              onClimbSelect={handleClimbSelect}
              onLoadMore={onLoadMore}
              header={header}
              headerInline={headerInline}
              hideEndMessage={hideEndMessage}
              showBottomSpacer={showBottomSpacer}
            />
          </PlaylistsProvider>
        </FavoritesProvider>
      ) : null}
    </Box>
  );
}
