'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import FollowingAscentsFeed from '@/app/components/social/following-ascents-feed';
import GlobalAscentsFeed from '@/app/components/social/global-ascents-feed';
import UserSearchDrawer from '@/app/components/social/user-search-drawer';
import UserDrawer from '@/app/components/user-drawer/user-drawer';
import BottomTabBar from '@/app/components/bottom-tab-bar/bottom-tab-bar';
import QueueControlBar from '@/app/components/queue-control/queue-control-bar';
import { usePersistentSession } from '@/app/components/persistent-session';
import { PersistentQueueProvider } from '@/app/components/queue-control/persistent-queue-provider';
import { BoardProvider } from '@/app/components/board-provider/board-provider-context';
import { BluetoothProvider } from '@/app/components/board-bluetooth-control/bluetooth-context';
import { useSession } from 'next-auth/react';
import { themeTokens } from '@/app/theme/theme-config';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import ErrorBoundary from '@/app/components/error-boundary';
import bottomBarStyles from '@/app/components/bottom-tab-bar/bottom-bar-wrapper.module.css';

interface HomePageContentProps {
  boardConfigs: BoardConfigData;
}

export default function HomePageContent({ boardConfigs }: HomePageContentProps) {
  const { data: session, status } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const {
    activeSession,
    localQueue,
    localCurrentClimbQueueItem,
    localBoardDetails,
  } = usePersistentSession();

  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // Determine if there's an active queue to show the QueueControlBar
  const isPartyMode = !!activeSession;
  const queueBoardDetails = isPartyMode ? activeSession.boardDetails : localBoardDetails;
  const queueAngle = isPartyMode
    ? activeSession.parsedParams.angle
    : (localCurrentClimbQueueItem?.climb?.angle ?? 0);
  const hasActiveQueue = (localQueue.length > 0 || !!localCurrentClimbQueueItem || !!activeSession) && !!queueBoardDetails;

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', pb: '60px' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${themeTokens.neutral[200]}`,
        }}
      >
        <UserDrawer boardConfigs={boardConfigs} />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isAuthenticated && (
            <MuiButton
              startIcon={<PersonSearchOutlined />}
              onClick={() => setSearchOpen(true)}
              size="small"
              variant="outlined"
            >
              Find Climbers
            </MuiButton>
          )}
        </Box>
      </Box>

      {/* Feed */}
      <Box component="main" sx={{ flex: 1, px: 2, py: 2 }}>
        <Typography variant="h6" component="h1" sx={{ mb: 2 }}>
          Activity
        </Typography>
        {isAuthenticated ? (
          <FollowingAscentsFeed onFindClimbers={() => setSearchOpen(true)} />
        ) : (
          <GlobalAscentsFeed />
        )}
      </Box>

      {/* Bottom Bar: QueueControlBar (if active) + BottomTabBar */}
      <div className={bottomBarStyles.bottomBarWrapper}>
        {hasActiveQueue && queueBoardDetails && (
          <ErrorBoundary>
            <BoardProvider boardName={queueBoardDetails.board_name}>
              <PersistentQueueProvider boardDetails={queueBoardDetails} angle={queueAngle}>
                <BluetoothProvider boardDetails={queueBoardDetails}>
                  <QueueControlBar boardDetails={queueBoardDetails} angle={queueAngle} />
                </BluetoothProvider>
              </PersistentQueueProvider>
            </BoardProvider>
          </ErrorBoundary>
        )}
        <BottomTabBar boardConfigs={boardConfigs} />
      </div>

      {isAuthenticated && (
        <UserSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </Box>
  );
}
