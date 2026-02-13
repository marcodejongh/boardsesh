'use client';

import React, { useState, useCallback } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import Favorite from '@mui/icons-material/Favorite';
import { track } from '@vercel/analytics';
import { ClimbActionProps, ClimbActionResult } from '../types';
import { useFavorite } from '../use-favorite';
import AuthModal from '../../auth/auth-modal';
import { themeTokens } from '@/app/theme/theme-config';
import { buildActionResult, computeActionDisplay } from '../action-view-renderer';
import { executeGraphQL } from '@/app/lib/graphql/client';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { TOGGLE_FAVORITE, type ToggleFavoriteMutationVariables, type ToggleFavoriteMutationResponse } from '@/app/lib/graphql/operations';

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
  const { token: authToken } = useWsAuthToken();
  const { iconSize } = computeActionDisplay(viewMode, size, showLabel);

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
      const data = await executeGraphQL<ToggleFavoriteMutationResponse, ToggleFavoriteMutationVariables>(
        TOGGLE_FAVORITE,
        { input: { boardName: boardDetails.board_name, climbUuid: climb.uuid, angle } },
        authToken,
      );
      if (data.toggleFavorite.favorited !== undefined) {
        track('Favorite Toggle', {
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          action: 'favorited',
        });
      }
    } catch {
      // Silently fail
    }
  }, [boardDetails.board_name, climb.uuid, angle, authToken]);

  const label = isFavorited ? 'Favorited' : 'Favorite';
  const HeartIcon = isFavorited ? Favorite : FavoriteBorderOutlined;
  const iconStyle = isFavorited ? { color: themeTokens.colors.error, fontSize: iconSize } : { fontSize: iconSize };
  const icon = isLoading ? <CircularProgress size={16} /> : <HeartIcon sx={iconStyle} />;

  const authModalElement = (
    <AuthModal
      open={showAuthModal}
      onClose={() => setShowAuthModal(false)}
      onSuccess={handleAuthSuccess}
      title="Sign in to save favorites"
      description={`Sign in to save "${climb.name}" to your favorites.`}
    />
  );

  return buildActionResult({
    key: 'favorite',
    label,
    icon: <HeartIcon sx={iconStyle} />,
    onClick: handleClick,
    viewMode,
    size,
    showLabel,
    disabled: disabled || isLoading,
    className,
    extraContent: authModalElement,
    dropdownElementOverride: authModalElement,
  });
}

export default FavoriteAction;
