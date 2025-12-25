'use client';

import React, { useState, useEffect } from 'react';
import { Button, Space, message, Dropdown } from 'antd';
import {
  HeartOutlined,
  PlusCircleOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  MoreOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueueContext } from '../graphql-queue';
import { Climb, BoardDetails } from '@/app/lib/types';
import type { MenuProps } from 'antd';
import styles from './climb-view-actions.module.css';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';

type ClimbViewActionsProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  auroraAppUrl: string;
  angle: number;
};

const ClimbViewActions = ({ climb, boardDetails, auroraAppUrl, angle }: ClimbViewActionsProps) => {
  const { addToQueue, queue } = useQueueContext();
  const [isDuplicate, setDuplicateTimer] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const router = useRouter();

  const isAlreadyInQueue = queue.some((item) => item.climb?.uuid === climb.uuid);

  useEffect(() => {
    // Check if we can go back and if the previous page was on Boardsesh
    const checkCanGoBack = () => {
      if (typeof window !== 'undefined') {
        // Check if there's history to go back to
        const hasHistory = window.history.length > 1;

        // Check if document.referrer exists and is from the same origin
        const referrer = document.referrer;
        const isSameOrigin =
          referrer !== '' && (referrer.startsWith(window.location.origin) || referrer.includes('boardsesh.com'));

        setCanGoBack(hasHistory && isSameOrigin);
      }
    };

    checkCanGoBack();
  }, []);

  const handleAddToQueue = () => {
    if (addToQueue && !isDuplicate) {
      addToQueue(climb);

      const climbName = climb.name || '';
      message.info(`Successfully added ${climbName} to the queue`);

      setDuplicateTimer(true);

      setTimeout(() => {
        setDuplicateTimer(false);
      }, 3000);
    }
  };

  const handleFavourite = () => {
    message.info('TODO: Implement favourite functionality');
  };

  const handleAddToList = () => {
    message.info('TODO: Implement add to list functionality');
  };

  const handleTick = () => {
    message.info('TODO: Implement tick functionality');
  };

  const handleBackClick = () => {
    if (canGoBack) {
      window.history.back();
    } else {
      const backUrl = getBackToListUrl();
      router.push(backUrl);
    }
  };

  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    // Use slug-based URL construction if slug names are available
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }

    // Fallback to numeric format
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
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

  return (
    <div className={styles.container}>
      {/* Mobile view: Show back button + key actions + overflow menu */}
      <div className={styles.mobileActions}>
        <div className={styles.mobileLeft}>
          {canGoBack ? (
            <Button icon={<ArrowLeftOutlined />} onClick={handleBackClick}>
              Back
            </Button>
          ) : (
            <Link href={getBackToListUrl()}>
              <Button icon={<ArrowLeftOutlined />}>
                Back
              </Button>
            </Link>
          )}
        </div>

        <div className={styles.mobileRight}>
          <Button icon={<HeartOutlined />} onClick={handleFavourite} />

          {isAlreadyInQueue ? (
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleAddToQueue}
              disabled={isDuplicate}
              className={styles.inQueueButton}
            >
              In Queue
            </Button>
          ) : (
            <Button icon={<PlusCircleOutlined />} onClick={handleAddToQueue} disabled={isDuplicate}>
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
        {canGoBack ? (
          <Button icon={<ArrowLeftOutlined />} className={styles.backButton} onClick={handleBackClick}>
            Back to List
          </Button>
        ) : (
          <Link href={getBackToListUrl()}>
            <Button icon={<ArrowLeftOutlined />} className={styles.backButton}>
              Back to List
            </Button>
          </Link>
        )}

        <div className={styles.actionButtons}>
          <Space wrap>
            <Button icon={<HeartOutlined />} onClick={handleFavourite}>
              Favourite
            </Button>

            <Button icon={<PlusCircleOutlined />} onClick={handleAddToList}>
              Add to List
            </Button>

            <Button icon={<CheckCircleOutlined />} onClick={handleTick}>
              Tick
            </Button>

            {isAlreadyInQueue ? (
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleAddToQueue}
                disabled={isDuplicate}
                className={styles.inQueueButton}
              >
                In Queue
              </Button>
            ) : (
              <Button icon={<PlusCircleOutlined />} onClick={handleAddToQueue} disabled={isDuplicate}>
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
  );
};

export default ClimbViewActions;
