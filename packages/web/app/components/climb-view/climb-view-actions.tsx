'use client';

import React, { useState } from 'react';
import { Button, Space, Dropdown, message } from 'antd';
import {
  HeartOutlined,
  HeartFilled,
  PlusCircleOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useQueueContext } from '../graphql-queue';
import { Climb, BoardDetails } from '@/app/lib/types';
import type { MenuProps } from 'antd';
import styles from './climb-view-actions.module.css';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { useFavorite } from '../climb-actions';
import { track } from '@vercel/analytics';
import AuthModal from '../auth/auth-modal';
import BackButton from '../back-button';

type ClimbViewActionsProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  auroraAppUrl: string;
  angle: number;
};

const ClimbViewActions = ({ climb, boardDetails, auroraAppUrl, angle }: ClimbViewActionsProps) => {
  const { addToQueue } = useQueueContext();
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { isFavorited, isLoading: isFavoriteLoading, toggleFavorite, isAuthenticated } = useFavorite({
    boardName: boardDetails.board_name,
    climbUuid: climb.uuid,
    angle,
  });

  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    // Use slug-based URL construction if slug names are available
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }

    // Fallback to numeric format
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
  };

  const handleAddToQueue = () => {
    if (addToQueue && !recentlyAdded) {
      addToQueue(climb);

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
  };

  const handleAddToList = () => {
    message.info('TODO: Implement add to list functionality');
  };

  const handleTick = () => {
    message.info('TODO: Implement tick functionality');
  };

  // Define menu items for the meatball menu (overflow actions on mobile)
  const menuItems: MenuProps['items'] = [
    {
      key: 'addToList',
      label: 'Add to List',
      icon: <PlusCircleOutlined />,
      onClick: handleAddToList,
    },
    {
      key: 'tick',
      label: 'Tick',
      icon: <CheckCircleOutlined />,
      onClick: handleTick,
    },
    {
      key: 'openInApp',
      label: 'Open in App',
      icon: <AppstoreOutlined />,
      onClick: () => window.open(auroraAppUrl, '_blank', 'noopener'),
    },
  ];

  const FavoriteIcon = isFavorited ? HeartFilled : HeartOutlined;
  const favoriteIconStyle = isFavorited ? { color: '#ff4d4f' } : undefined;

  return (
    <>
      <div className={styles.container}>
        {/* Mobile view: Show back button + key actions + overflow menu */}
        <div className={styles.mobileActions}>
          <div className={styles.mobileLeft}>
            <BackButton fallbackUrl={getBackToListUrl()} />
          </div>

          <div className={styles.mobileRight}>
            <Button
              icon={<FavoriteIcon style={favoriteIconStyle} />}
              onClick={handleFavorite}
              loading={isFavoriteLoading}
            />

            {recentlyAdded ? (
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleAddToQueue}
                disabled
                className={styles.inQueueButton}
              >
                Added
              </Button>
            ) : (
              <Button icon={<PlusCircleOutlined />} onClick={handleAddToQueue}>
                Queue
              </Button>
            )}

            <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </div>
        </div>

        {/* Desktop view: Show all buttons */}
        <div className={styles.desktopActions}>
          <BackButton fallbackUrl={getBackToListUrl()} className={styles.backButton} />

          <div className={styles.actionButtons}>
            <Space wrap>
              <Button
                icon={<FavoriteIcon style={favoriteIconStyle} />}
                onClick={handleFavorite}
                loading={isFavoriteLoading}
              >
                {isFavorited ? 'Favorited' : 'Favorite'}
              </Button>

              <Button icon={<PlusCircleOutlined />} onClick={handleAddToList}>
                Add to List
              </Button>

              <Button icon={<CheckCircleOutlined />} onClick={handleTick}>
                Tick
              </Button>

              {recentlyAdded ? (
                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={handleAddToQueue}
                  disabled
                  className={styles.inQueueButton}
                >
                  Added to Queue
                </Button>
              ) : (
                <Button icon={<PlusCircleOutlined />} onClick={handleAddToQueue}>
                  Add to Queue
                </Button>
              )}

              <Button icon={<AppstoreOutlined />} href={auroraAppUrl} target="_blank" rel="noopener">
                Open in App
              </Button>
            </Space>
          </div>
        </div>
      </div>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to save favorites"
        description={`Sign in to save "${climb.name}" to your favorites.`}
      />
    </>
  );
};

export default ClimbViewActions;
