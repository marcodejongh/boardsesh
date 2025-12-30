'use client';

import React, { useCallback } from 'react';
import { Button, message } from 'antd';
import { ActionTooltip } from '../action-tooltip';
import { ShareAltOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import {
  constructClimbViewUrl,
  constructClimbViewUrlWithSlugs,
} from '@/app/lib/url-utils';

export function ShareAction({
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
  const viewUrl = boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
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

  const handleClick = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${viewUrl}`
      : viewUrl;

    const shareData = {
      title: climb.name,
      text: `Check out "${climb.name}" (${climb.difficulty}) on Boardsesh`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        track('Climb Shared', {
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          method: 'native',
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        message.success('Link copied to clipboard!');
        track('Climb Shared', {
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          method: 'clipboard',
        });
      }
      onComplete?.();
    } catch (error) {
      // User cancelled share or error occurred
      if ((error as Error).name !== 'AbortError') {
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(shareUrl);
          message.success('Link copied to clipboard!');
        } catch {
          message.error('Failed to share');
        }
      }
    }
  }, [climb, viewUrl, boardDetails.board_name, onComplete]);

  const label = 'Share';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const icon = <ShareAltOutlined style={{ fontSize: iconSize }} />;

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
    <Button
      icon={icon}
      onClick={handleClick}
      size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
      disabled={disabled}
      className={className}
    >
      {shouldShowLabel && label}
    </Button>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'share',
    label,
    icon,
    onClick: () => handleClick(),
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
    key: 'share',
    available: true,
  };
}

export default ShareAction;
