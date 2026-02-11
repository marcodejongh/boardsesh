'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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

interface HomePageContentProps {
  boardConfigs: BoardConfigData;
}

export default function HomePageContent({ boardConfigs }: HomePageContentProps) {
  const { data: session, status } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedBoardUuid, setSelectedBoardUuid] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>('new');

  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // Load persisted sort mode
  useEffect(() => {
    getPreference<SortMode>('activityFeedSortMode').then((saved) => {
      if (saved) setSortBy(saved);
    });
  }, []);

  const handleSortChange = useCallback((newSort: SortMode) => {
    setSortBy(newSort);
    setPreference('activityFeedSortMode', newSort);
  }, []);

  const handleBoardFilter = useCallback((boardUuid: string | null) => {
    setSelectedBoardUuid(boardUuid);
  }, []);

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
            includeAllPill
          />
        )}
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
