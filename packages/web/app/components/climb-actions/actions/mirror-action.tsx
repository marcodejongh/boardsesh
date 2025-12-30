'use client';

import React, { useCallback } from 'react';
import { Button } from 'antd';
import { ActionTooltip } from '../action-tooltip';
import { SwapOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useQueueContext } from '../../graphql-queue';

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
  const icon = <SwapOutlined style={iconStyle} />;

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
    <Button
      icon={icon}
      onClick={handleClick}
      type={isMirrored ? 'primary' : 'default'}
      size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
      disabled={disabled}
      className={className}
    >
      {shouldShowLabel && label}
    </Button>
  ) : null;

  // Menu item for dropdown
  const menuItem = {
    key: 'mirror',
    label,
    icon,
    onClick: () => handleClick(),
    disabled: !canMirror,
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
