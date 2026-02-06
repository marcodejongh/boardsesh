'use client';

import React, { useCallback } from 'react';
import { Button } from 'antd';
import { ActionTooltip } from '../action-tooltip';
import { PlayCircleOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useQueueContext } from '../../graphql-queue';
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
  const { setCurrentClimb, currentClimb } = useQueueContext();

  const isCurrentClimb = currentClimb?.uuid === climb.uuid;

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (isCurrentClimb) return;

    setCurrentClimb(climb);

    track('Set Active Climb', {
      boardLayout: boardDetails.layout_name || '',
      climbUuid: climb.uuid,
    });

    onComplete?.();
  }, [isCurrentClimb, setCurrentClimb, climb, boardDetails.layout_name, onComplete]);

  const label = isCurrentClimb ? 'Active' : 'Set Active';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const iconStyle = isCurrentClimb
    ? { color: themeTokens.colors.primary, fontSize: iconSize }
    : { fontSize: iconSize };
  const icon = <PlayCircleOutlined style={iconStyle} />;

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
    <Button
      icon={icon}
      onClick={handleClick}
      disabled={disabled || isCurrentClimb}
      size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
      className={className}
    >
      {shouldShowLabel && label}
    </Button>
  );

  // List mode - full-width row for drawer menus
  const listElement = (
    <Button
      type="text"
      icon={icon}
      block
      onClick={handleClick}
      disabled={disabled || isCurrentClimb}
      style={{
        height: 48,
        justifyContent: 'flex-start',
        paddingLeft: themeTokens.spacing[4],
        fontSize: themeTokens.typography.fontSize.base,
      }}
    >
      {label}
    </Button>
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
    available: true,
  };
}

export default SetActiveAction;
