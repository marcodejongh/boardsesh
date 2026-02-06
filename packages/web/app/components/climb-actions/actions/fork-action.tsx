'use client';

import React from 'react';
import { Button } from 'antd';
import { ActionTooltip } from '../action-tooltip';
import { ForkOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { constructCreateClimbUrl } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';

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

  const icon = <ForkOutlined style={{ fontSize: iconSize }} />;

  // Icon mode - for Card actions
  const iconElement = url ? (
    <ActionTooltip title="Fork this climb">
      <Link href={url} onClick={handleClick} className={className} style={{ color: 'inherit' }}>
        {icon}
      </Link>
    </ActionTooltip>
  ) : null;

  // Button mode
  const buttonElement = url ? (
    <Link href={url} onClick={handleClick}>
      <Button
        icon={icon}
        size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
        disabled={disabled}
        className={className}
      >
        {shouldShowLabel && label}
      </Button>
    </Link>
  ) : null;

  // Menu item for dropdown
  const menuItem = url
    ? {
        key: 'fork',
        label: (
          <Link href={url} onClick={handleClick} style={{ color: 'inherit' }}>
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
    <Link href={url} onClick={handleClick} style={{ textDecoration: 'none' }}>
      <Button
        type="text"
        icon={icon}
        block
        disabled={disabled}
        style={{
          height: 48,
          justifyContent: 'flex-start',
          paddingLeft: themeTokens.spacing[4],
          fontSize: themeTokens.typography.fontSize.base,
          color: 'inherit',
        }}
      >
        {label}
      </Button>
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
