'use client';

import React, { useState, useCallback, useMemo } from 'react';
import MuiButton from '@mui/material/Button';
import MuiBadge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
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

    setDrawerVisible(true);
    onComplete?.();
  }, [boardDetails.layout_name, badgeCount, onComplete]);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const handleOpenInApp = useCallback(() => {
    const url = constructClimbInfoUrl(boardDetails, climb.uuid, angle);
    window.open(url, '_blank', 'noopener');
    closeDrawer();
  }, [boardDetails, climb.uuid, angle, closeDrawer]);

  const renderSignInPrompt = () => (
    <Stack spacing={3} style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
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
    </Stack>
  );

  const label = 'Tick';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const icon = <CheckOutlined sx={{ fontSize: iconSize }} />;
  const badgeColor = hasSuccessfulAscent ? themeTokens.colors.success : themeTokens.colors.error;

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
          swipeRegion="body"
          styles={{ wrapper: { height: '50%' } }}
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
        <MuiBadge badgeContent={badgeCount} max={99} sx={{ '& .MuiBadge-badge': { backgroundColor: badgeColor, color: '#fff' } }}>
          <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
            {icon}
          </span>
        </MuiBadge>
      </ActionTooltip>
      {drawers}
    </>
  );

  // Button mode
  const buttonElement = (
    <>
      <MuiBadge badgeContent={badgeCount} max={99} sx={{ '& .MuiBadge-badge': { backgroundColor: badgeColor, color: '#fff' } }}>
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
