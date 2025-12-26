'use client';
import React, { useState, useCallback } from 'react';
import { useQueueContext } from '../graphql-queue';
import { BoardDetails, Climb } from '@/app/lib/types';
import {
  PlusCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ForkOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import Link from 'next/link';
import { constructClimbViewUrl, constructClimbViewUrlWithSlugs, constructCreateClimbUrl } from '@/app/lib/url-utils';
import { track } from '@vercel/analytics';
import AuthModal from '../auth/auth-modal';
import { useSession } from 'next-auth/react';

type ClimbCardActionsProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  isFavorited?: boolean;
  onFavoriteToggle?: (climbUuid: string, newState: boolean) => void;
};

const ClimbCardActions = ({ climb, boardDetails, isFavorited = false, onFavoriteToggle }: ClimbCardActionsProps) => {
  const { addToQueue, queue } = useQueueContext();
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  if (!climb) {
    return [];
  }

  const handleAddToQueue = () => {
    if (addToQueue && !recentlyAdded) {
      addToQueue(climb);

      track('Add to Queue', {
        boardLayout: boardDetails.layout_name || '',
        queueLength: queue.length + 1,
      });

      setRecentlyAdded(true);

      setTimeout(() => {
        setRecentlyAdded(false);
      }, 5000);
    }
  };

  const handleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (isToggling) return;

    setIsToggling(true);
    try {
      const newState = !isFavorited;

      // Call the API
      const response = await fetch('/api/internal/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          angle: climb.angle,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onFavoriteToggle?.(climb.uuid, result.favorited);
        track('Favorite Toggle', {
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          action: result.favorited ? 'favorited' : 'unfavorited',
        });
      }
    } catch {
      // Silently fail
    } finally {
      setIsToggling(false);
    }
  }, [isAuthenticated, isToggling, isFavorited, boardDetails.board_name, climb.uuid, climb.angle, onFavoriteToggle]);

  const handleAuthSuccess = useCallback(async () => {
    // Call API directly since session state may not have updated yet
    try {
      const response = await fetch('/api/internal/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          angle: climb.angle,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        onFavoriteToggle?.(climb.uuid, result.favorited);
        track('Favorite Toggle', {
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          action: 'favorited',
        });
      }
    } catch {
      // Silently fail
    }
  }, [boardDetails.board_name, climb.uuid, climb.angle, onFavoriteToggle]);

  const HeartIcon = isFavorited ? HeartFilled : HeartOutlined;

  const actions: React.JSX.Element[] = [
    <Link
      key="infocircle"
      href={
        boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
          ? constructClimbViewUrlWithSlugs(
              boardDetails.board_name,
              boardDetails.layout_name,
              boardDetails.size_name,
              boardDetails.size_description,
              boardDetails.set_names,
              climb.angle,
              climb.uuid,
              climb.name,
            )
          : constructClimbViewUrl(
              {
                board_name: boardDetails.board_name,
                layout_id: boardDetails.layout_id,
                size_id: boardDetails.size_id,
                set_ids: boardDetails.set_ids,
                angle: climb.angle,
              },
              climb.uuid,
              climb.name,
            )
      }
      onClick={() => {
        track('Climb Info Viewed', {
          boardLayout: boardDetails.layout_name || '',
        });
      }}
    >
      <InfoCircleOutlined />
    </Link>,
    ...(boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
      ? [
          <Link
            key="fork"
            href={constructCreateClimbUrl(
              boardDetails.board_name,
              boardDetails.layout_name,
              boardDetails.size_name,
              boardDetails.size_description,
              boardDetails.set_names,
              climb.angle,
              { frames: climb.frames, name: climb.name },
            )}
            onClick={() => {
              track('Climb Forked', {
                boardLayout: boardDetails.layout_name || '',
                originalClimb: climb.uuid,
              });
            }}
            title="Fork this climb"
          >
            <ForkOutlined />
          </Link>,
        ]
      : []),
    <React.Fragment key="heart">
      <HeartIcon
        onClick={handleFavorite}
        style={{ color: isFavorited ? '#ff4d4f' : 'inherit' }}
      />
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to save favorites"
        description={`Sign in to save "${climb.name}" to your favorites.`}
      />
    </React.Fragment>,
    recentlyAdded ? (
      <CheckCircleOutlined
        key="queue"
        onClick={handleAddToQueue}
        style={{ color: '#52c41a', cursor: 'not-allowed' }}
      />
    ) : (
      <PlusCircleOutlined
        key="queue"
        onClick={handleAddToQueue}
        style={{ color: 'inherit', cursor: 'pointer' }}
      />
    ),
  ];

  return actions;
};

const MemoizedClimbCardActions = React.memo(ClimbCardActions);
MemoizedClimbCardActions.displayName = 'ClimbCardActions';

export default MemoizedClimbCardActions;
