'use client';

import React, { useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import { ActionTooltip } from '../action-tooltip';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useQueueContext } from '../../graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';

export function MirrorAction({
  climb,
  boardDetails,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
}: ClimbActionProps): ClimbActionResult {
  const { mirrorClimb, currentClimb } = useQueueContext();

  const canMirror = boardDetails.supportsMirroring === true;
  const isMirrored = currentClimb?.mirrored ?? climb.mirrored ?? false;

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!canMirror) return;

    mirrorClimb();

    track('Mirror Climb', {
      boardName: boardDetails.board_name,
      climbUuid: climb.uuid,
      mirrored: !isMirrored,
    });

    onComplete?.();
  }, [canMirror, mirrorClimb, boardDetails.board_name, climb.uuid, isMirrored, onComplete]);

  const label = isMirrored ? 'Mirrored' : 'Mirror';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const iconStyle = isMirrored
    ? { color: '#1890ff', fontSize: iconSize }
    : { fontSize: iconSize };
  const icon = <SwapHorizOutlined sx={iconStyle} />;

  // Icon mode - for Card actions
  const iconElement = canMirror ? (
    <ActionTooltip title={isMirrored ? 'Mirrored (click to reset)' : 'Mirror climb'}>
      <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
        {icon}
      </span>
    </ActionTooltip>
  ) : null;

  // Button mode
  const buttonElement = canMirror ? (
    <MuiButton
      variant={isMirrored ? 'contained' : 'outlined'}
      startIcon={icon}
      onClick={handleClick}
      size={size === 'large' ? 'large' : 'small'}
      disabled={disabled}
      className={className}
    >
      {shouldShowLabel && label}
    </MuiButton>
  ) : null;

  // Menu item for dropdown
  const menuItem = {
    key: 'mirror',
    label,
    icon,
    onClick: () => handleClick(),
    disabled: !canMirror,
  };

  // List mode - full-width row for drawer menus
  const listElement = canMirror ? (
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
  ) : null;

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
    key: 'mirror',
    available: canMirror,
  };
}

export default MirrorAction;
