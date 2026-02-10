'use client';

import React, { useCallback } from 'react';
import PlayCircleOutlineOutlined from '@mui/icons-material/PlayCircleOutlineOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useOptionalQueueContext } from '../../graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';
import { buildActionResult, computeActionDisplay, ActionIconElement } from '../action-view-renderer';

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
  const queueContext = useOptionalQueueContext();
  const { iconSize } = computeActionDisplay(viewMode, size, showLabel);

  const isCurrentClimb = queueContext?.currentClimb?.uuid === climb.uuid;

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!queueContext || isCurrentClimb) return;

    queueContext.setCurrentClimb(climb);

    track('Set Active Climb', {
      boardLayout: boardDetails.layout_name || '',
      climbUuid: climb.uuid,
    });

    onComplete?.();
  }, [queueContext, isCurrentClimb, climb, boardDetails.layout_name, onComplete]);

  const label = isCurrentClimb ? 'Active' : 'Set Active';
  const iconStyle = isCurrentClimb
    ? { color: themeTokens.colors.primary, fontSize: iconSize }
    : { fontSize: iconSize };
  const icon = <PlayCircleOutlineOutlined sx={iconStyle} />;

  return buildActionResult({
    key: 'setActive',
    label,
    icon,
    onClick: handleClick,
    viewMode,
    size,
    showLabel,
    disabled: disabled || isCurrentClimb,
    className,
    available: !!queueContext,
    iconElementOverride: (
      <ActionIconElement
        tooltip={isCurrentClimb ? 'Currently active' : 'Set as active climb'}
        onClick={handleClick}
        className={className}
      >
        <span style={{ cursor: isCurrentClimb ? 'default' : 'pointer' }}>{icon}</span>
      </ActionIconElement>
    ),
    menuItem: {
      key: 'setActive',
      label,
      icon,
      onClick: () => handleClick(),
      disabled: isCurrentClimb,
    },
  });
}

export default SetActiveAction;
