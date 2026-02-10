'use client';

import React, { useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import { ActionTooltip } from '../action-tooltip';
import PlayCircleOutlineOutlined from '@mui/icons-material/PlayCircleOutlineOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useOptionalQueueContext } from '../../graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';

export function SetActiveAction({
  climb,
  boardDetails,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
}: ClimbActionProps): ClimbActionResult {
  const queueContext = useOptionalQueueContext();

  const isCurrentClimb = queueContext?.currentClimb?.uuid === climb.uuid;

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!queueContext || isCurrentClimb) return;

    queueContext.setCurrentClimb(climb);

    track('Set Active Climb', {
      boardLayout: boardDetails.layout_name || '',
      climbUuid: climb.uuid,
    });

    onComplete?.();
  }, [queueContext, isCurrentClimb, climb, boardDetails.layout_name, onComplete]);

  const label = isCurrentClimb ? 'Active' : 'Set Active';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const iconStyle = isCurrentClimb
    ? { color: themeTokens.colors.primary, fontSize: iconSize }
    : { fontSize: iconSize };
  const icon = <PlayCircleOutlineOutlined sx={iconStyle} />;

  // Icon mode - for Card actions
  const iconElement = (
    <ActionTooltip title={isCurrentClimb ? 'Currently active' : 'Set as active climb'}>
      <span
        onClick={handleClick}
        style={{ cursor: isCurrentClimb ? 'default' : 'pointer' }}
        className={className}
      >
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
      disabled={disabled || isCurrentClimb}
      size={size === 'large' ? 'large' : 'small'}
      className={className}
    >
      {shouldShowLabel && label}
    </MuiButton>
  );

  // List mode - full-width row for drawer menus
  const listElement = (
    <MuiButton
      variant="text"
      startIcon={icon}
      fullWidth
      onClick={handleClick}
      disabled={disabled || isCurrentClimb}
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

  // Menu item for dropdown
  const menuItem = {
    key: 'setActive',
    label,
    icon,
    onClick: () => handleClick(),
    disabled: isCurrentClimb,
  };

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
    key: 'setActive',
    available: !!queueContext,
  };
}

export default SetActiveAction;
