'use client';

import React, { useCallback } from 'react';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { buildActionResult, computeActionDisplay } from '../action-view-renderer';

interface OpenInAppActionProps extends ClimbActionProps {
  auroraAppUrl?: string;
}

export function OpenInAppAction({
  climb,
  boardDetails,
  angle,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
  auroraAppUrl,
}: OpenInAppActionProps): ClimbActionResult {
  const url = auroraAppUrl || constructClimbInfoUrl(boardDetails, climb.uuid);
  const { iconSize } = computeActionDisplay(viewMode, size, showLabel);

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();

    track('Open in Aurora App', {
      boardName: boardDetails.board_name,
      climbUuid: climb.uuid,
    });

    window.open(url, '_blank', 'noopener');
    onComplete?.();
  }, [boardDetails.board_name, climb.uuid, url, onComplete]);

  const icon = <AppsOutlined sx={{ fontSize: iconSize }} />;

  return buildActionResult({
    key: 'openInApp',
    label: 'Open in App',
    icon,
    onClick: handleClick,
    viewMode,
    size,
    showLabel,
    disabled,
    className,
  });
}

export default OpenInAppAction;
