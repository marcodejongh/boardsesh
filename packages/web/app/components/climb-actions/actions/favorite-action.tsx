'use client';

import React, { useState, useCallback } from 'react';
import { Button } from 'antd';
import { ActionTooltip } from '../action-tooltip';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useFavorite } from '../use-favorite';
import AuthModal from '../../auth/auth-modal';
import { themeTokens } from '@/app/theme/theme-config';

export function FavoriteAction({
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
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { isFavorited, isLoading, toggleFavorite, isAuthenticated } = useFavorite({
    climbUuid: climb.uuid,
  });

  const handleClick = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    try {
      const newState = await toggleFavorite();
      track('Favorite Toggle', {
        boardName: boardDetails.board_name,
        climbUuid: climb.uuid,
        action: newState ? 'favorited' : 'unfavorited',
      });
      onComplete?.();
    } catch {
      // Silently fail
    }
  }, [isAuthenticated, toggleFavorite, boardDetails.board_name, climb.uuid, onComplete]);

  const handleAuthSuccess = useCallback(async () => {
    try {
      const response = await fetch('/api/internal/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          angle,
        }),
      });
      if (response.ok) {
        track('Favorite Toggle', {
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          action: 'favorited',
        });
      }
    } catch {
      // Silently fail
    }
  }, [boardDetails.board_name, climb.uuid, angle]);

  const label = isFavorited ? 'Favorited' : 'Favorite';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const HeartIcon = isFavorited ? HeartFilled : HeartOutlined;
  const iconStyle = isFavorited ? { color: '#ff4d4f', fontSize: iconSize } : { fontSize: iconSize };
  const icon = <HeartIcon style={iconStyle} />;

  const authModalElement = (
    <AuthModal
      open={showAuthModal}
      onClose={() => setShowAuthModal(false)}
      onSuccess={handleAuthSuccess}
      title="Sign in to save favorites"
      description={`Sign in to save "${climb.name}" to your favorites.`}
    />
  );

  // Icon mode - for Card actions
  const iconElement = (
    <>
      <ActionTooltip title={label}>
        <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
          {icon}
        </span>
      </ActionTooltip>
      {authModalElement}
    </>
  );

  // Button mode
  const buttonElement = (
    <>
      <Button
        icon={icon}
        onClick={handleClick}
        loading={isLoading}
        size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
        disabled={disabled}
        className={className}
      >
        {shouldShowLabel && label}
      </Button>
      {authModalElement}
    </>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'favorite',
    label,
    icon,
    onClick: () => handleClick(),
  };

  // List mode - full-width row for drawer menus
  const listElement = (
    <>
      <Button
        type="text"
        icon={icon}
        block
        onClick={handleClick}
        loading={isLoading}
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
      {authModalElement}
    </>
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
      element = authModalElement; // Need to render auth modal even in dropdown mode
      break;
    default:
      element = iconElement;
  }

  return {
    element,
    menuItem,
    key: 'favorite',
    available: true,
  };
}

export default FavoriteAction;
