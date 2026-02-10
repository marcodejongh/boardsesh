'use client';

import React, { useCallback } from 'react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import {
  constructClimbViewUrl,
  constructClimbViewUrlWithSlugs,
} from '@/app/lib/url-utils';
import { buildActionResult, computeActionDisplay } from '../action-view-renderer';

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
  const { showMessage } = useSnackbar();
  const { iconSize } = computeActionDisplay(viewMode, size, showLabel);

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
        showMessage('Link copied to clipboard!', 'success');
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
          showMessage('Link copied to clipboard!', 'success');
        } catch {
          showMessage('Failed to share', 'error');
        }
      }
    }
  }, [climb, viewUrl, boardDetails.board_name, onComplete]);

  const icon = <ShareOutlined sx={{ fontSize: iconSize }} />;

  return buildActionResult({
    key: 'share',
    label: 'Share',
    icon,
    onClick: handleClick,
    viewMode,
    size,
    showLabel,
    disabled,
    className,
  });
}

export default ShareAction;
