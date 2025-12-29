'use client';

import React, { useState } from 'react';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { track } from '@vercel/analytics';
import { useFavorite } from './use-favorite';
import { BoardName } from '@/app/lib/types';
import AuthModal from '../auth/auth-modal';

type FavoriteButtonProps = {
  boardName: BoardName;
  climbUuid: string;
  climbName?: string;
  angle: number;
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'default';
};

export default function FavoriteButton({
  boardName,
  climbUuid,
  climbName,
  angle,
  className,
  showLabel = false,
  size = 'default',
}: FavoriteButtonProps) {
  const { isFavorited, isLoading, toggleFavorite, isAuthenticated } = useFavorite({
    climbUuid,
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    try {
      const newState = await toggleFavorite();

      track('Favorite Toggle', {
        boardName,
        climbUuid,
        action: newState ? 'favorited' : 'unfavorited',
      });
    } catch {
      // Silently fail
    }
  };

  const handleAuthSuccess = async () => {
    // Call API directly since session state may not have updated yet
    try {
      const response = await fetch('/api/internal/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardName,
          climbUuid,
          angle,
        }),
      });
      if (response.ok) {
        track('Favorite Toggle', {
          boardName,
          climbUuid,
          action: 'favorited',
        });
      }
    } catch {
      // Silently fail
    }
  };

  const iconStyle: React.CSSProperties = {
    fontSize: size === 'small' ? 14 : 16,
    color: isFavorited ? '#ff4d4f' : 'inherit',
    cursor: isLoading ? 'wait' : 'pointer',
    transition: 'color 0.2s, transform 0.2s',
  };

  const Icon = isFavorited ? HeartFilled : HeartOutlined;

  const content = (
    <>
      <Icon style={iconStyle} />
      {showLabel && <span style={{ marginLeft: 8 }}>{isFavorited ? 'Favorited' : 'Favorite'}</span>}
    </>
  );

  return (
    <>
      <Tooltip title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
        <span
          onClick={handleClick}
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: isLoading ? 'wait' : 'pointer',
          }}
          role="button"
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {content}
        </span>
      </Tooltip>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to save favorites"
        description={climbName ? `Sign in to save "${climbName}" to your favorites.` : 'Sign in to save climbs to your favorites.'}
      />
    </>
  );
}
