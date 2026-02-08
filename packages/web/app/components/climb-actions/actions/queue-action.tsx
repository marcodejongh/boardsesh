'use client';

import React, { useState, useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import { ActionTooltip } from '../action-tooltip';
import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useQueueContext } from '../../graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';

export function QueueAction({
  climb,
  boardDetails,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
}: ClimbActionProps): ClimbActionResult {
  const { addToQueue, queue } = useQueueContext();
  const [recentlyAdded, setRecentlyAdded] = useState(false);

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!addToQueue || recentlyAdded) return;

    addToQueue(climb);

    track('Add to Queue', {
      boardLayout: boardDetails.layout_name || '',
      queueLength: queue.length + 1,
    });

    setRecentlyAdded(true);
    setTimeout(() => {
      setRecentlyAdded(false);
    }, 5000);

    onComplete?.();
  }, [addToQueue, recentlyAdded, climb, boardDetails.layout_name, queue.length, onComplete]);

  const label = recentlyAdded ? 'Added' : 'Add to Queue';
  const shortLabel = recentlyAdded ? 'Added' : 'Queue';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const Icon = recentlyAdded ? CheckCircleOutlined : AddCircleOutlined;
  const iconStyle = recentlyAdded
    ? { color: themeTokens.colors.success, fontSize: iconSize }
    : { fontSize: iconSize };
  const icon = <Icon sx={iconStyle} />;

  // Icon mode - for Card actions
  const iconElement = (
    <ActionTooltip title={recentlyAdded ? 'Added to queue' : 'Add to queue'}>
      <span
        onClick={handleClick}
        style={{ cursor: recentlyAdded ? 'not-allowed' : 'pointer' }}
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
      disabled={disabled || recentlyAdded}
      size={size === 'large' ? 'large' : 'small'}
      className={className}
    >
      {shouldShowLabel && (viewMode === 'compact' ? shortLabel : label)}
    </MuiButton>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'queue',
    label,
    icon,
    onClick: () => handleClick(),
    disabled: recentlyAdded,
  };

  // List mode - full-width row for drawer menus
  const listElement = (
    <MuiButton
      variant="text"
      startIcon={icon}
      fullWidth
      onClick={handleClick}
      disabled={disabled || recentlyAdded}
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
    key: 'queue',
    available: true,
  };
}

export default QueueAction;
