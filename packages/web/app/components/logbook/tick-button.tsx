'use client';

import React, { useState, useMemo } from 'react';
import { Angle, Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import MuiBadge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import { track } from '@vercel/analytics';
import { LogAscentDrawer } from './log-ascent-drawer';
import AuthModal from '../auth/auth-modal';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import { useAlwaysTickInApp } from '@/app/hooks/use-always-tick-in-app';

interface TickButtonProps {
  angle: Angle;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
  buttonType?: 'default' | 'text';
}

export const TickButton: React.FC<TickButtonProps> = ({ currentClimb, angle, boardDetails, buttonType = 'default' }) => {
  const { logbook, isAuthenticated } = useBoardProvider();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { alwaysUseApp, loaded, enableAlwaysUseApp } = useAlwaysTickInApp();

  const showDrawer = () => {
    track('Tick Button Clicked', {
      boardLayout: boardDetails.layout_name || '',
      existingAscentCount: badgeCount,
    });

    if (!isAuthenticated && alwaysUseApp && loaded && currentClimb) {
      const url = constructClimbInfoUrl(boardDetails, currentClimb.uuid, angle);
      window.open(url, '_blank', 'noopener');
      return;
    }

    setDrawerVisible(true);
  };
  const closeDrawer = () => setDrawerVisible(false);

  const handleOpenInApp = () => {
    if (!currentClimb) return;
    const url = constructClimbInfoUrl(boardDetails, currentClimb.uuid, angle);
    window.open(url, '_blank', 'noopener');
    closeDrawer();
  };

  const filteredLogbook = useMemo(
    () => logbook.filter((asc) => asc.climb_uuid === currentClimb?.uuid && Number(asc.angle) === angle),
    [logbook, currentClimb?.uuid, angle],
  );
  const hasSuccessfulAscent = filteredLogbook.some((asc) => asc.is_ascent);
  const badgeCount = filteredLogbook.length;

  return (
    <>
      <MuiBadge
        badgeContent={badgeCount > 0 ? badgeCount : 0}
        max={100}
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: hasSuccessfulAscent ? themeTokens.colors.success : themeTokens.colors.error,
            color: 'common.white',
          },
        }}
      >
        <IconButton id="button-tick" onClick={showDrawer}>
          <CheckOutlined />
        </IconButton>
      </MuiBadge>

      {isAuthenticated ? (
        <LogAscentDrawer
          open={drawerVisible}
          onClose={closeDrawer}
          currentClimb={currentClimb}
          boardDetails={boardDetails}
        />
      ) : (
        <SwipeableDrawer
          title="Sign In Required"
          placement="bottom"
          onClose={closeDrawer}
          open={drawerVisible}
          swipeRegion="handle"
          styles={{ wrapper: { height: '60%' } }}
        >
          <Stack spacing={3} sx={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
            <Typography variant="body2" component="span" fontWeight={600} sx={{ fontSize: 16 }}>Sign in to record ticks</Typography>
            <Typography variant="body1" component="p" color="text.secondary">
              Create a Boardsesh account to log your climbs and track your progress.
            </Typography>
            <Button variant="contained" startIcon={<LoginOutlined />} onClick={() => setShowAuthModal(true)} fullWidth>
              Sign In
            </Button>
            <Typography variant="body1" component="p" color="text.secondary">
              Or log your tick in the official app:
            </Typography>
            <Button variant="outlined" startIcon={<AppsOutlined />} onClick={handleOpenInApp} fullWidth>
              Open in App
            </Button>
            <Button
              variant="text"
              size="small"
              color="secondary"
              onClick={async () => {
                await enableAlwaysUseApp();
                handleOpenInApp();
              }}
            >
              Always open in app
            </Button>
          </Stack>
        </SwipeableDrawer>
      )}

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to record ticks"
        description="Create an account to log your climbs and track your progress."
      />
    </>
  );
};
