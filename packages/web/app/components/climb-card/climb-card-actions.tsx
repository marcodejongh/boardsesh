'use client';
import React, { useState } from 'react';
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
import { useFavorite } from '../climb-actions';
import AuthModal from '../auth/auth-modal';

type ClimbCardActionsProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
};

const ClimbCardActions = ({ climb, boardDetails }: ClimbCardActionsProps) => {
  const { addToQueue, queue } = useQueueContext();
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { isFavorited, toggleFavorite, isAuthenticated } = useFavorite({
    boardName: boardDetails.board_name,
    climbUuid: climb?.uuid ?? '',
    angle: climb?.angle ?? 0,
  });

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

  const handleFavorite = async () => {
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
          boardName: boardDetails.board_name,
          climbUuid: climb.uuid,
          angle: climb.angle,
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
  };

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

export default ClimbCardActions;
