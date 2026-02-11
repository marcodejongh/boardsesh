'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import ActivityFeed from '@/app/components/activity-feed/activity-feed';
import FeedSortSelector from '@/app/components/activity-feed/feed-sort-selector';
import searchPillStyles from '@/app/components/search-drawer/search-pill.module.css';
import UserSearchDrawer from '@/app/components/social/user-search-drawer';
import UserDrawer from '@/app/components/user-drawer/user-drawer';
import BottomTabBar from '@/app/components/bottom-tab-bar/bottom-tab-bar';
import PersistentQueueControlBar from '@/app/components/queue-control/persistent-queue-control-bar';
import { useSession } from 'next-auth/react';

import { BoardConfigData } from '@/app/lib/server-board-configs';
import ErrorBoundary from '@/app/components/error-boundary';
import BoardSelectorPills from '@/app/components/board-entity/board-selector-pills';
import type { SortMode } from '@boardsesh/shared-schema';
import bottomBarStyles from '@/app/components/bottom-tab-bar/bottom-bar-wrapper.module.css';
import { getPreference, setPreference } from '@/app/lib/user-preferences-db';
import { NewClimbFeed } from '@/app/components/new-climb-feed';
import type { UserBoard, NewClimbSubscription } from '@boardsesh/shared-schema';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_MY_NEW_CLIMB_SUBSCRIPTIONS,
  type GetMyNewClimbSubscriptionsResponse,
} from '@/app/lib/graphql/operations/new-climb-feed';

interface HomePageContentProps {
  boardConfigs: BoardConfigData;
}

export default function HomePageContent({ boardConfigs }: HomePageContentProps) {
  const { data: session, status } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedBoardUuid, setSelectedBoardUuid] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<UserBoard | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>('new');
  const [activeTab, setActiveTab] = useState<'activity' | 'newClimbs'>('activity');
  const [subscriptions, setSubscriptions] = useState<NewClimbSubscription[]>([]);

  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const { token: wsAuthToken } = useWsAuthToken();

  // Load persisted sort mode and tab
  useEffect(() => {
    getPreference<SortMode>('activityFeedSortMode').then((saved) => {
      if (saved) setSortBy(saved);
    });
    getPreference<'activity' | 'newClimbs'>('homeTab').then((saved) => {
      if (saved) setActiveTab(saved);
    });
  }, []);

  const handleSortChange = useCallback((newSort: SortMode) => {
    setSortBy(newSort);
    setPreference('activityFeedSortMode', newSort);
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, value: string) => {
    const tab = value as 'activity' | 'newClimbs';
    setActiveTab(tab);
    setPreference('homeTab', tab);
  };

  const handleBoardFilter = useCallback((boardUuid: string | null) => {
    setSelectedBoardUuid(boardUuid);
    if (!boardUuid) {
      setSelectedBoard(null);
    }
  }, []);

  const handleBoardSelect = useCallback((board: UserBoard) => {
    setSelectedBoard(board);
    setSelectedBoardUuid(board.uuid);
  }, []);

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
        {isAuthenticated && (
          <button
            className={searchPillStyles.pill}
            onClick={() => setSearchOpen(true)}
            type="button"
          >
            <SearchOutlined className={searchPillStyles.icon} />
            <span className={searchPillStyles.text}>Search boards & climbers</span>
          </button>
        )}
      </Box>

      {/* Feed */}
      <Box component="main" sx={{ flex: 1, px: 2, py: 2 }}>
        {isAuthenticated && (
          <BoardSelectorPills
            mode="filter"
            onBoardFilter={handleBoardFilter}
            onBoardSelect={handleBoardSelect}
            includeAllPill
          />
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

      {/* Bottom Bar: QueueControlBar (if active) + BottomTabBar */}
      <div className={bottomBarStyles.bottomBarWrapper}>
        <ErrorBoundary>
          <PersistentQueueControlBar />
        </ErrorBoundary>
        <BottomTabBar boardConfigs={boardConfigs} />
      </div>

      {isAuthenticated && (
        <UserSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </Box>
  );
}
