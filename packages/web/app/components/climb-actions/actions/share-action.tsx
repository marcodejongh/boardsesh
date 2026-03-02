'use client';

import React, { useCallback } from 'react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import {
  getContextAwareClimbViewUrl,
} from '@/app/lib/url-utils';
import { buildActionResult, computeActionDisplay } from '../action-view-renderer';

export function ShareAction({
  climb,
  boardDetails,
  angle,
  currentPathname,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
}: ClimbActionProps): ClimbActionResult {
  const { showMessage } = useSnackbar();
  const { iconSize } = computeActionDisplay(viewMode, size, showLabel);

  const viewUrl = getContextAwareClimbViewUrl(
    currentPathname ?? '',
    boardDetails,
    angle,
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
