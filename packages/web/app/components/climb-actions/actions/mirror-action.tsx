'use client';

import React, { useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import { ActionTooltip } from '../action-tooltip';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useOptionalQueueContext } from '../../graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';
import { buildActionResult, computeActionDisplay, ActionListElement } from '../action-view-renderer';

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
  const queueContext = useOptionalQueueContext();
  const { iconSize, shouldShowLabel } = computeActionDisplay(viewMode, size, showLabel);

  const canMirror = boardDetails.supportsMirroring === true && !!queueContext;
  const isMirrored = queueContext?.currentClimb?.mirrored ?? climb.mirrored ?? false;

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!canMirror || !queueContext) return;

    queueContext.mirrorClimb();

    track('Mirror Climb', {
      boardName: boardDetails.board_name,
      climbUuid: climb.uuid,
      mirrored: !isMirrored,
    });

    onComplete?.();
  }, [canMirror, queueContext, boardDetails.board_name, climb.uuid, isMirrored, onComplete]);

  const label = isMirrored ? 'Mirrored' : 'Mirror';
  const iconStyle = isMirrored
    ? { color: themeTokens.colors.purple, fontSize: iconSize }
    : { fontSize: iconSize };
  const icon = <SwapHorizOutlined sx={iconStyle} />;

  // Mirror has custom rendering when unavailable (returns null elements)
  return buildActionResult({
    key: 'mirror',
    label,
    icon,
    onClick: handleClick,
    viewMode,
    size,
    showLabel,
    disabled,
    className,
    available: canMirror,
    iconElementOverride: canMirror ? (
      <ActionTooltip title={isMirrored ? 'Mirrored (click to reset)' : 'Mirror climb'}>
        <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
          {icon}
        </span>
      </ActionTooltip>
    ) : null,
    buttonElementOverride: canMirror ? (
      <MuiButton
        variant={isMirrored ? 'contained' : 'outlined'}
        startIcon={icon}
        onClick={handleClick}
        size={size === 'large' ? 'large' : 'small'}
        disabled={disabled}
        className={className}
      >
        {shouldShowLabel && label}
      </MuiButton>
    ) : null,
    listElementOverride: canMirror ? (
      <ActionListElement icon={icon} label={label} onClick={handleClick} disabled={disabled} />
    ) : null,
    menuItem: {
      key: 'mirror',
      label,
      icon,
      onClick: () => handleClick(),
      disabled: !canMirror,
    },
  });
}

export default MirrorAction;
