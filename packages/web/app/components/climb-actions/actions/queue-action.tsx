'use client';

import React, { useState, useCallback } from 'react';
import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useOptionalQueueContext } from '../../graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';
import { buildActionResult, computeActionDisplay, ActionIconElement, ActionButtonElement } from '../action-view-renderer';

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
  const queueContext = useOptionalQueueContext();
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const { iconSize, shouldShowLabel } = computeActionDisplay(viewMode, size, showLabel);

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!queueContext?.addToQueue || recentlyAdded) return;

    queueContext.addToQueue(climb);

    track('Add to Queue', {
      boardLayout: boardDetails.layout_name || '',
      queueLength: (queueContext.queue?.length ?? 0) + 1,
    });

    setRecentlyAdded(true);
    setTimeout(() => {
      setRecentlyAdded(false);
    }, 5000);

    onComplete?.();
  }, [queueContext, recentlyAdded, climb, boardDetails.layout_name, onComplete]);

  const label = recentlyAdded ? 'Added' : 'Add to Queue';
  const shortLabel = recentlyAdded ? 'Added' : 'Queue';

  const Icon = recentlyAdded ? CheckCircleOutlined : AddCircleOutlined;
  const iconStyle = recentlyAdded
    ? { color: themeTokens.colors.success, fontSize: iconSize }
    : { fontSize: iconSize };
  const icon = <Icon sx={iconStyle} />;

  return buildActionResult({
    key: 'queue',
    label,
    icon,
    onClick: handleClick,
    viewMode,
    size,
    showLabel,
    disabled: disabled || recentlyAdded,
    className,
    available: !!queueContext,
    iconElementOverride: (
      <ActionIconElement
        tooltip={recentlyAdded ? 'Added to queue' : 'Add to queue'}
        onClick={handleClick}
        className={className}
      >
        <span style={{ cursor: recentlyAdded ? 'not-allowed' : 'pointer' }}>{icon}</span>
      </ActionIconElement>
    ),
    buttonElementOverride: (
      <ActionButtonElement
        icon={icon}
        label={viewMode === 'compact' ? shortLabel : label}
        showLabel={shouldShowLabel}
        onClick={handleClick}
        disabled={disabled || recentlyAdded}
        size={size}
        className={className}
      />
    ),
    menuItem: {
      key: 'queue',
      label,
      icon,
      onClick: () => handleClick(),
      disabled: recentlyAdded,
    },
  });
}

export default QueueAction;
