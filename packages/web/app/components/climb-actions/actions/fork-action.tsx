'use client';

import React from 'react';
import MuiButton from '@mui/material/Button';
import { ActionTooltip } from '../action-tooltip';
import CallSplitOutlined from '@mui/icons-material/CallSplitOutlined';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { constructCreateClimbUrl } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';

const linkResetStyle: React.CSSProperties = { color: 'inherit', textDecoration: 'none' };

export function ForkAction({
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
  // Fork is not supported for moonboard yet
  const isMoonboard = boardDetails.board_name === 'moonboard';
  const canFork = !isMoonboard && !!(boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names);

  const url = canFork
    ? constructCreateClimbUrl(
        boardDetails.board_name,
        boardDetails.layout_name!,
        boardDetails.size_name!,
        boardDetails.size_description,
        boardDetails.set_names!,
        angle,
        { frames: climb.frames, name: climb.name },
      )
    : null;

  const handleClick = () => {
    track('Climb Forked', {
      boardLayout: boardDetails.layout_name || '',
      originalClimb: climb.uuid,
    });
    onComplete?.();
  };

  const label = 'Fork';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const icon = <CallSplitOutlined sx={{ fontSize: iconSize }} />;

  // Icon mode - for Card actions
  const iconElement = url ? (
    <ActionTooltip title="Fork this climb">
      <Link href={url} onClick={handleClick} className={className} style={linkResetStyle}>
        {icon}
      </Link>
    </ActionTooltip>
  ) : null;

  // Button mode
  const buttonElement = url ? (
    <Link href={url} onClick={handleClick} style={linkResetStyle}>
      <MuiButton
        variant="outlined"
        startIcon={icon}
        size={size === 'large' ? 'large' : 'small'}
        disabled={disabled}
        className={className}
      >
        {shouldShowLabel && label}
      </MuiButton>
    </Link>
  ) : null;

  // Menu item for dropdown
  const menuItem = url
    ? {
        key: 'fork',
        label: (
          <Link href={url} onClick={handleClick} style={linkResetStyle}>
            {label}
          </Link>
        ),
        icon,
      }
    : {
        key: 'fork',
        label,
        icon,
        disabled: true,
      };

  // List mode - full-width row for drawer menus
  const listElement = url ? (
    <Link href={url} onClick={handleClick} style={linkResetStyle}>
      <MuiButton
        variant="text"
        startIcon={icon}
        fullWidth
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
    </Link>
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
    key: 'fork',
    available: canFork,
  };
}

export default ForkAction;
