'use client';

import React, { useState, useCallback, useMemo } from 'react';
import MuiButton from '@mui/material/Button';
import MuiBadge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import SwipeableDrawer from '../../swipeable-drawer/swipeable-drawer';
import { ActionTooltip } from '../action-tooltip';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useOptionalBoardProvider, BoardProvider } from '../../board-provider/board-provider-context';
import AuthModal from '../../auth/auth-modal';
import { LogAscentForm } from '../../logbook/logascent-form';
import { track } from '@vercel/analytics';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import { useAlwaysTickInApp } from '@/app/hooks/use-always-tick-in-app';
import { useSession } from 'next-auth/react';
import { useMyBoards } from '@/app/hooks/use-my-boards';
import BoardScrollSection from '../../board-scroll/board-scroll-section';
import BoardScrollCard from '../../board-scroll/board-scroll-card';
import type { UserBoard } from '@boardsesh/shared-schema';
import type { BoardName } from '@/app/lib/types';
import { LogAscentDrawer } from '../../logbook/log-ascent-drawer';

export function TickAction({
  climb,
  boardDetails,
  angle,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
}: ClimbActionProps): ClimbActionResult {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<UserBoard | null>(null);

  // Use optional board provider - allows TickAction to work outside board routes
  const boardProvider = useOptionalBoardProvider();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = boardProvider?.isAuthenticated ?? (sessionStatus === 'authenticated');
  const logbook = boardProvider?.logbook ?? [];

  // Fetch user's boards when we need the board selector (no existing BoardProvider + authenticated)
  const needsBoardSelector = !boardProvider && isAuthenticated;
  const { boards: myBoards, isLoading: isLoadingBoards } = useMyBoards(needsBoardSelector);

  // Filter boards to matching board type (e.g., only Kilter boards for a Kilter climb)
  const matchingBoards = useMemo(() =>
    myBoards.filter(b => b.boardType === boardDetails.board_name),
    [myBoards, boardDetails.board_name]
  );

  const { alwaysUseApp, loaded, enableAlwaysUseApp } = useAlwaysTickInApp();

  // Find ascent entries for this climb
  const filteredLogbook = useMemo(() => {
    if (!logbook || !climb) return [];
    return logbook.filter(
      (asc) => asc.climb_uuid === climb.uuid && Number(asc.angle) === angle
    );
  }, [logbook, climb, angle]);

  const hasSuccessfulAscent = filteredLogbook.some((asc) => asc.is_ascent);
  const badgeCount = filteredLogbook.length;

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    track('Tick Button Clicked', {
      boardLayout: boardDetails.layout_name || '',
      existingAscentCount: badgeCount,
    });

    if (!isAuthenticated && alwaysUseApp && loaded) {
      const url = constructClimbInfoUrl(boardDetails, climb.uuid, angle);
      window.open(url, '_blank', 'noopener');
      onComplete?.();
      return;
    }

    setDrawerVisible(true);
    onComplete?.();
  }, [boardDetails, badgeCount, onComplete, isAuthenticated, alwaysUseApp, loaded, climb.uuid, angle]);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
    setSelectedBoard(null);
  }, []);

  const handleOpenInApp = useCallback(() => {
    const url = constructClimbInfoUrl(boardDetails, climb.uuid, angle);
    window.open(url, '_blank', 'noopener');
    closeDrawer();
  }, [boardDetails, climb.uuid, angle, closeDrawer]);

  const renderSignInPrompt = () => (
    <Stack spacing={3} sx={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
      <Typography variant="body2" component="span" fontWeight={600} sx={{ fontSize: 16 }}>Sign in to record ticks</Typography>
      <Typography variant="body1" component="p" color="text.secondary">
        Create a Boardsesh account to log your climbs and track your progress.
      </Typography>
      <MuiButton variant="contained" startIcon={<LoginOutlined />} onClick={() => setShowAuthModal(true)} fullWidth>
        Sign In
      </MuiButton>
      <Typography variant="body1" component="p" color="text.secondary">
        Or log your tick in the official app:
      </Typography>
      <MuiButton variant="outlined" startIcon={<AppsOutlined />} onClick={handleOpenInApp} fullWidth>
        Open in App
      </MuiButton>
      <MuiButton
        variant="text"
        size="small"
        color="secondary"
        onClick={async () => {
          await enableAlwaysUseApp();
          handleOpenInApp();
        }}
      >
        Always open in app
      </MuiButton>
    </Stack>
  );

  const label = 'Tick';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const icon = <CheckOutlined sx={{ fontSize: iconSize }} />;
  const badgeColor = hasSuccessfulAscent ? themeTokens.colors.success : themeTokens.colors.error;

  // Whether to skip the board selector and go straight to the form
  // (either we have a BoardProvider already, or there are no matching boards to choose from)
  const skipBoardSelector = !needsBoardSelector || (!isLoadingBoards && matchingBoards.length === 0);

  const renderBoardSelector = () => (
    <Stack spacing={2} sx={{ py: 2 }}>
      <Typography variant="body2" fontWeight={600} sx={{ fontSize: 16, textAlign: 'center' }}>
        Which board did you climb on?
      </Typography>
      <BoardScrollSection loading={isLoadingBoards} size="small">
        {matchingBoards.map((board) => (
          <BoardScrollCard
            key={board.uuid}
            userBoard={board}
            size="small"
            selected={selectedBoard?.uuid === board.uuid}
            onClick={() => setSelectedBoard(board)}
          />
        ))}
      </BoardScrollSection>
    </Stack>
  );

  const renderLogAscentForm = () => (
    <LogAscentForm
      currentClimb={climb}
      boardDetails={boardDetails}
      onClose={closeDrawer}
    />
  );

  const drawers = (
    <>
      {boardProvider ? (
        // Inside a board route - existing flow unchanged
        isAuthenticated ? (
          <LogAscentDrawer
            open={drawerVisible}
            onClose={closeDrawer}
            currentClimb={climb}
            boardDetails={boardDetails}
          />
        ) : (
          <SwipeableDrawer
            title="Sign In Required"
            placement="bottom"
            onClose={closeDrawer}
            open={drawerVisible}
            styles={{ wrapper: { height: '60%' } }}
          >
            {renderSignInPrompt()}
          </SwipeableDrawer>
        )
      ) : isAuthenticated ? (
        // Outside board route, authenticated - board selector + log form
        <SwipeableDrawer
          title={selectedBoard || skipBoardSelector ? 'Log Ascent' : 'Select Board'}
          placement="bottom"
          onClose={closeDrawer}
          open={drawerVisible}
          styles={{ wrapper: { height: selectedBoard || skipBoardSelector ? '100%' : '60%' } }}
        >
          {selectedBoard || skipBoardSelector ? (
            <BoardProvider boardName={(selectedBoard?.boardType ?? boardDetails.board_name) as BoardName}>
              {renderLogAscentForm()}
            </BoardProvider>
          ) : (
            renderBoardSelector()
          )}
        </SwipeableDrawer>
      ) : (
        // Outside board route, not authenticated - sign-in prompt
        <SwipeableDrawer
          title="Sign In Required"
          placement="bottom"
          onClose={closeDrawer}
          open={drawerVisible}
          styles={{ wrapper: { height: '60%' } }}
        >
          {renderSignInPrompt()}
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

  // Icon mode - for Card actions
  const iconElement = (
    <>
      <ActionTooltip title={label}>
        <MuiBadge badgeContent={badgeCount} max={99} sx={{ '& .MuiBadge-badge': { backgroundColor: badgeColor, color: 'common.white' } }}>
          <Box component="span" onClick={handleClick} sx={{ cursor: 'pointer' }} className={className}>
            {icon}
          </Box>
        </MuiBadge>
      </ActionTooltip>
      {drawers}
    </>
  );

  // Button mode
  const buttonElement = (
    <>
      <MuiBadge badgeContent={badgeCount} max={99} sx={{ '& .MuiBadge-badge': { backgroundColor: badgeColor, color: 'common.white' } }}>
        <MuiButton
          variant="outlined"
          startIcon={icon}
          onClick={handleClick}
          size={size === 'large' ? 'large' : 'small'}
          disabled={disabled}
          className={className}
        >
          {shouldShowLabel && label}
        </MuiButton>
      </MuiBadge>
      {drawers}
    </>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'tick',
    label: badgeCount > 0 ? `${label} (${badgeCount})` : label,
    icon,
    onClick: () => handleClick(),
  };

  // List mode - full-width row for drawer menus
  const listElement = (
    <>
      <MuiButton
        variant="text"
        startIcon={icon}
        fullWidth
        onClick={handleClick}
        disabled={disabled}
        sx={{
          height: 48,
          justifyContent: 'flex-start',
          paddingLeft: `${themeTokens.spacing[4]}px`,
          fontSize: themeTokens.typography.fontSize.base,
        }}
      >
        {badgeCount > 0 ? `${label} (${badgeCount})` : label}
      </MuiButton>
      {drawers}
    </>
  );

  let element: React.ReactNode;
  switch (viewMode) {
    case 'icon':
      element = iconElement;
      break;
    case 'button':
    case 'compact':
      element = buttonElement;
      break;
    case 'list':
      element = listElement;
      break;
    case 'dropdown':
      element = drawers; // Need to render drawers even in dropdown mode
      break;
    default:
      element = iconElement;
  }

  return {
    element,
    menuItem,
    key: 'tick',
    available: true,
  };
}

export default TickAction;
