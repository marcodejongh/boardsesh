'use client';

import React, { useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import { ActionTooltip } from '../action-tooltip';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';

interface OpenInAppActionProps extends ClimbActionProps {
  auroraAppUrl?: string;
}

export function OpenInAppAction({
  climb,
  boardDetails,
  angle,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
  auroraAppUrl,
}: OpenInAppActionProps): ClimbActionResult {
  const url = auroraAppUrl || constructClimbInfoUrl(boardDetails, climb.uuid, angle);

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();

    track('Open in Aurora App', {
      boardName: boardDetails.board_name,
      climbUuid: climb.uuid,
    });

    window.open(url, '_blank', 'noopener');
    onComplete?.();
  }, [boardDetails.board_name, climb.uuid, url, onComplete]);

  const label = 'Open in App';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const icon = <AppsOutlined sx={{ fontSize: iconSize }} />;

  // Icon mode - for Card actions
  const iconElement = (
    <ActionTooltip title={label}>
      <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
        {icon}
      </span>
    </ActionTooltip>
  );

  // Button mode
  const buttonElement = (
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
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'openInApp',
    label,
    icon,
    onClick: () => handleClick(),
  };

  // List mode - full-width row for drawer menus
  const listElement = (
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
      {label}
    </MuiButton>
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
      element = null; // Use menuItem instead
      break;
    default:
      element = iconElement;
  }

  return {
    element,
    menuItem,
    key: 'openInApp',
    available: true,
  };
}

export default OpenInAppAction;
