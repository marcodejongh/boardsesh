'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import PlayCircleOutlineOutlined from '@mui/icons-material/PlayCircleOutlineOutlined';
import Button from '@mui/material/Button';
import ActivityFeed from '@/app/components/activity-feed/activity-feed';
import FeedSortSelector from '@/app/components/activity-feed/feed-sort-selector';
import searchPillStyles from '@/app/components/search-drawer/search-pill.module.css';
import UnifiedSearchDrawer from '@/app/components/search-drawer/unified-search-drawer';
import UserDrawer from '@/app/components/user-drawer/user-drawer';
import StartSeshDrawer from '@/app/components/session-creation/start-sesh-drawer';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

import { BoardConfigData } from '@/app/lib/server-board-configs';
import BoardScrollSection from '@/app/components/board-scroll/board-scroll-section';
import BoardScrollCard from '@/app/components/board-scroll/board-scroll-card';
import type { SortMode, ActivityFeedItem } from '@boardsesh/shared-schema';
import { NewClimbFeed } from '@/app/components/new-climb-feed';
import type { UserBoard, NewClimbSubscription } from '@boardsesh/shared-schema';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_MY_NEW_CLIMB_SUBSCRIPTIONS,
  type GetMyNewClimbSubscriptionsResponse,
} from '@/app/lib/graphql/operations/new-climb-feed';
import { useMyBoards } from '@/app/hooks/use-my-boards';
import boardScrollStyles from '@/app/components/board-scroll/board-scroll.module.css';

const SORT_MODES: SortMode[] = ['new', 'top', 'controversial', 'hot'];
const TAB_DEFAULTS: Record<string, string> = { tab: 'activity', sort: 'new' };

interface HomePageContentProps {
  boardConfigs: BoardConfigData;
  initialTab?: 'activity' | 'newClimbs';
  initialBoardUuid?: string;
  initialSortBy?: SortMode;
  initialTrendingFeed?: { items: ActivityFeedItem[]; cursor: string | null; hasMore: boolean } | null;
}

export default function HomePageContent({
  boardConfigs,
  initialTab = 'activity',
  initialBoardUuid,
  initialSortBy = 'new',
  initialTrendingFeed,
}: HomePageContentProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [startSeshOpen, setStartSeshOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<UserBoard | null>(null);
  const [subscriptions, setSubscriptions] = useState<NewClimbSubscription[]>([]);

  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const { token: wsAuthToken } = useWsAuthToken();
  const { boards: myBoards, isLoading: isLoadingBoards } = useMyBoards(isAuthenticated);

  // Read state from URL params (with fallbacks to server-provided initial values)
  const activeTab = (searchParams.get('tab') === 'newClimbs' ? 'newClimbs' : (searchParams.get('tab') || initialTab)) as 'activity' | 'newClimbs';
  const selectedBoardUuid = searchParams.get('board') || initialBoardUuid || null;
  const sortBy = (SORT_MODES.includes(searchParams.get('sort') as SortMode)
    ? searchParams.get('sort') : (searchParams.has('sort') ? initialSortBy : initialSortBy)) as SortMode;

  // Helper: update a URL param via shallow navigation
  const updateParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== TAB_DEFAULTS[key]) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/', { scroll: false });
  }, [router, searchParams]);

  const handleSortChange = useCallback((newSort: SortMode) => {
    updateParam('sort', newSort);
  }, [updateParam]);

  const handleTabChange = (_: React.SyntheticEvent, value: string) => {
    updateParam('tab', value);
  };

  const handleBoardFilter = useCallback((boardUuid: string | null) => {
    updateParam('board', boardUuid);
    if (!boardUuid) {
      setSelectedBoard(null);
    }
  }, [updateParam]);

  const handleBoardSelect = useCallback((board: UserBoard) => {
    setSelectedBoard(board);
    updateParam('board', board.uuid);
  }, [updateParam]);

  useEffect(() => {
    async function fetchSubscriptions() {
      if (!isAuthenticated || !wsAuthToken) return;
      try {
        const client = createGraphQLHttpClient(wsAuthToken);
        const res = await client.request<GetMyNewClimbSubscriptionsResponse>(GET_MY_NEW_CLIMB_SUBSCRIPTIONS);
        setSubscriptions(res.myNewClimbSubscriptions);
      } catch (error) {
        console.error('Failed to fetch new climb subscriptions', error);
      }
    }
    fetchSubscriptions();
  }, [isAuthenticated, wsAuthToken]);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', pb: '60px' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid var(--neutral-200)',
        }}
      >
        <UserDrawer boardConfigs={boardConfigs} />
        <button
          className={searchPillStyles.pill}
          onClick={() => setSearchOpen(true)}
          type="button"
        >
          <SearchOutlined className={searchPillStyles.icon} />
          <span className={searchPillStyles.text}>Search</span>
        </button>
        <Box sx={{ ml: 'auto' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayCircleOutlineOutlined />}
            onClick={() => setStartSeshOpen(true)}
          >
            Sesh
          </Button>
        </Box>
      </Box>

      {/* Feed */}
      <Box component="main" sx={{ flex: 1, px: 2, py: 2 }}>
        {isAuthenticated && (myBoards.length > 0 || isLoadingBoards) && (
          <BoardScrollSection loading={isLoadingBoards} size="small">
            <div
              className={`${boardScrollStyles.cardScroll} ${boardScrollStyles.cardScrollSmall}`}
              onClick={() => {
                handleBoardFilter(null);
                setSelectedBoard(null);
              }}
            >
              <div className={`${boardScrollStyles.cardSquare} ${boardScrollStyles.filterSquare} ${!selectedBoardUuid ? boardScrollStyles.cardSquareSelected : ''}`}>
                <span className={boardScrollStyles.filterLabel}>All</span>
              </div>
              <div className={`${boardScrollStyles.cardName} ${!selectedBoardUuid ? boardScrollStyles.cardNameSelected : ''}`}>
                All Boards
              </div>
            </div>
            {myBoards.map((board) => (
              <BoardScrollCard
                key={board.uuid}
                userBoard={board}
                size="small"
                selected={selectedBoardUuid === board.uuid}
                onClick={() => handleBoardSelect(board)}
              />
            ))}
          </BoardScrollSection>
        )}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 2 }}
          aria-label="Home feed tabs"
        >
          <Tab label="Activity" value="activity" />
          <Tab label="New Climbs" value="newClimbs" />
        </Tabs>

        {activeTab === 'activity' && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h1">
                Activity
              </Typography>
              <FeedSortSelector sortBy={sortBy} onChange={handleSortChange} />
            </Box>
            <ActivityFeed
              isAuthenticated={isAuthenticated}
              boardUuid={selectedBoardUuid}
              sortBy={sortBy}
              onFindClimbers={() => setSearchOpen(true)}
              initialItems={initialTrendingFeed?.items}
            />
          </>
        )}

        {activeTab === 'newClimbs' && (
          <Box sx={{ mt: 1 }}>
            {selectedBoard ? (
              <NewClimbFeed
                boardType={selectedBoard.boardType}
                layoutId={selectedBoard.layoutId}
                isAuthenticated={isAuthenticated}
                isSubscribed={subscriptions.some(
                  (sub) =>
                    sub.boardType === selectedBoard.boardType &&
                    sub.layoutId === selectedBoard.layoutId,
                )}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Select a board to see new climbs for its layout.
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <UnifiedSearchDrawer
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        defaultCategory="boards"
      />

      <StartSeshDrawer
        open={startSeshOpen}
        onClose={() => setStartSeshOpen(false)}
        boardConfigs={boardConfigs}
      />
    </Box>
  );
}
