'use client';

import React from 'react';
import { Button } from 'antd';
import { ActionTooltip } from '../action-tooltip';
import { InfoCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import {
  constructClimbViewUrl,
  constructClimbViewUrlWithSlugs,
} from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';

const linkResetStyle: React.CSSProperties = { color: 'inherit', textDecoration: 'none' };

export function ViewDetailsAction({
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
  const url = boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
    ? constructClimbViewUrlWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name,
        boardDetails.size_name,
        boardDetails.size_description,
        boardDetails.set_names,
        angle,
        climb.uuid,
        climb.name,
      )
    : constructClimbViewUrl(
        {
          board_name: boardDetails.board_name,
          layout_id: boardDetails.layout_id,
          size_id: boardDetails.size_id,
          set_ids: boardDetails.set_ids,
          angle,
        },
        climb.uuid,
        climb.name,
      );

  const handleClick = () => {
    track('Climb Info Viewed', {
      boardLayout: boardDetails.layout_name || '',
      climbUuid: climb.uuid,
    });
    onComplete?.();
  };

  const label = 'View Details';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const icon = <InfoCircleOutlined style={{ fontSize: iconSize }} />;

  // Icon mode - for Card actions
  const iconElement = (
    <ActionTooltip title={label}>
      <Link href={url} onClick={handleClick} className={className} style={linkResetStyle}>
        {icon}
      </Link>
    </ActionTooltip>
  );

  // Button mode
  const buttonElement = (
    <Link href={url} onClick={handleClick} style={linkResetStyle}>
      <Button
        icon={icon}
        size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
        disabled={disabled}
        className={className}
      >
        {shouldShowLabel && label}
      </Button>
    </Link>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'viewDetails',
    label: (
      <Link href={url} onClick={handleClick} style={linkResetStyle}>
        {label}
      </Link>
    ),
    icon,
  };

  // List mode - full-width row for drawer menus
  const listElement = (
    <Link href={url} onClick={handleClick} style={linkResetStyle}>
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
        }}
      >
        {label}
      </Button>
    </Link>
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
    key: 'viewDetails',
    available: true,
  };
}

export default ViewDetailsAction;
