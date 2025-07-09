'use client';

import React, { useState } from 'react';
import { Button, Space, message, Dropdown } from 'antd';
import { HeartOutlined, PlusCircleOutlined, CheckCircleOutlined, AppstoreOutlined, MoreOutlined } from '@ant-design/icons';
import { useQueueContext } from '../queue-control/queue-context';
import { Climb, BoardDetails } from '@/app/lib/types';
import type { MenuProps } from 'antd';
import styles from './climb-view-actions.module.css';

type ClimbViewActionsProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  auroraAppUrl: string;
};

const ClimbViewActions = ({ climb, boardDetails, auroraAppUrl }: ClimbViewActionsProps) => {
  const { addToQueue, queue } = useQueueContext();
  const [isDuplicate, setDuplicateTimer] = useState(false);

  const isAlreadyInQueue = queue.some((item) => item.climb.uuid === climb.uuid);

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

  // Define menu items for the meatball menu (overflow actions)
  const menuItems: MenuProps['items'] = [
    {
      key: 'queue',
      label: isAlreadyInQueue ? 'In Queue' : 'Add to Queue',
      icon: isAlreadyInQueue ? <CheckCircleOutlined /> : <PlusCircleOutlined />,
      onClick: handleAddToQueue,
      disabled: isDuplicate,
      className: isAlreadyInQueue ? styles.inQueueButton : undefined,
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
      {/* Mobile view: Show main actions + meatball menu for overflow */}
      <div className={styles.mobileActions}>
        <Space>
          <Button 
            icon={<HeartOutlined />}
            onClick={handleFavourite}
          >
            Favourite
          </Button>
          
          <Button 
            icon={<PlusCircleOutlined />}
            onClick={handleAddToList}
          >
            Add to List
          </Button>
          
          <Button 
            icon={<CheckCircleOutlined />}
            onClick={handleTick}
          >
            Tick
          </Button>
          
          <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      </div>

      {/* Desktop view: Show all buttons */}
      <div className={styles.desktopActions}>
        <Space wrap>
          <Button 
            icon={<HeartOutlined />}
            onClick={handleFavourite}
          >
            Favourite
          </Button>
          
          <Button 
            icon={<PlusCircleOutlined />}
            onClick={handleAddToList}
          >
            Add to List
          </Button>
          
          <Button 
            icon={<CheckCircleOutlined />}
            onClick={handleTick}
          >
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
            <Button 
              icon={<PlusCircleOutlined />}
              onClick={handleAddToQueue}
              disabled={isDuplicate}
            >
              Add to Queue
            </Button>
          )}
          
          <Button 
            icon={<AppstoreOutlined />}
            href={auroraAppUrl}
            target="_blank"
            rel="noopener"
          >
            Open in App
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ClimbViewActions;