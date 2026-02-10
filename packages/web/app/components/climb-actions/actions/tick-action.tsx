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
import { useBoardProvider } from '../../board-provider/board-provider-context';
import AuthModal from '../../auth/auth-modal';
import { LogAscentDrawer } from '../../logbook/log-ascent-drawer';
import { track } from '@vercel/analytics';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import { useAlwaysTickInApp } from '@/app/hooks/use-always-tick-in-app';
import { buildActionResult, ActionButtonElement, ActionListElement, computeActionDisplay } from '../action-view-renderer';

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

  const {
    isAuthenticated,
    logbook,
  } = useBoardProvider();

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

  const { iconSize } = computeActionDisplay(viewMode, size, showLabel);
  const label = 'Tick';
  const badgeLabel = badgeCount > 0 ? `${label} (${badgeCount})` : label;

  const icon = <CheckOutlined sx={{ fontSize: iconSize }} />;
  const badgeColor = hasSuccessfulAscent ? themeTokens.colors.success : themeTokens.colors.error;
  const badgeSx = { '& .MuiBadge-badge': { backgroundColor: badgeColor, color: 'common.white' } };

  const drawers = (
    <>
      {isAuthenticated ? (
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
      )}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to record ticks"
        description="Create an account to log your climbs and track your progress."
      />
    </>
  );

  return buildActionResult({
    key: 'tick',
    label: badgeLabel,
    icon,
    onClick: handleClick,
    viewMode,
    size,
    showLabel,
    disabled,
    className,
    dropdownElementOverride: drawers,
    menuItem: {
      key: 'tick',
      label: badgeLabel,
      icon,
      onClick: () => handleClick(),
    },
    iconElementOverride: (
      <>
        <ActionTooltip title={label}>
          <MuiBadge badgeContent={badgeCount} max={99} sx={badgeSx}>
            <Box component="span" onClick={handleClick} sx={{ cursor: 'pointer' }} className={className}>
              {icon}
            </Box>
          </MuiBadge>
        </ActionTooltip>
        {drawers}
      </>
    ),
    buttonElementOverride: (
      <>
        <MuiBadge badgeContent={badgeCount} max={99} sx={badgeSx}>
          <ActionButtonElement
            icon={icon}
            label={label}
            showLabel={showLabel ?? (viewMode === 'button' || viewMode === 'dropdown')}
            onClick={handleClick}
            disabled={disabled}
            size={size}
            className={className}
          />
        </MuiBadge>
        {drawers}
      </>
    ),
    listElementOverride: (
      <>
        <ActionListElement
          icon={icon}
          label={badgeLabel}
          onClick={handleClick}
          disabled={disabled}
        />
        {drawers}
      </>
    ),
  });
}

export default TickAction;
