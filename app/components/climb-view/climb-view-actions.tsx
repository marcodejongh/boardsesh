'use client';

import React, { useState } from 'react';
import { Button, Space, message, Dropdown } from 'antd';
import { HeartOutlined, PlusCircleOutlined, CheckCircleOutlined, AppstoreOutlined, MoreOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueueContext } from '../queue-control/queue-context';
import { Climb, BoardDetails } from '@/app/lib/types';
import type { MenuProps } from 'antd';
import styles from './climb-view-actions.module.css';

type ClimbViewActionsProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  auroraAppUrl: string;
  angle: number;
};

const ClimbViewActions = ({ climb, boardDetails, auroraAppUrl, angle }: ClimbViewActionsProps) => {
  const { addToQueue, queue } = useQueueContext();
  const [isDuplicate, setDuplicateTimer] = useState(false);
  const pathname = usePathname();

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

  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, set_names } = boardDetails;
    
    // Use slug format if available, otherwise fall back to numeric
    const layout = layout_name || boardDetails.layout_id;
    const size = size_name || boardDetails.size_id;
    const sets = set_names?.join(',') || boardDetails.set_ids.join(',');
    
    return `/${board_name}/${layout}/${size}/${sets}/${angle}/list`;
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
        <Link href={getBackToListUrl()}>
          <Button 
            icon={<ArrowLeftOutlined />}
            className={styles.backButton}
          >
            Back
          </Button>
        </Link>
        
        <div className={styles.actionButtons}>
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
      </div>

      {/* Desktop view: Show all buttons */}
      <div className={styles.desktopActions}>
        <Link href={getBackToListUrl()}>
          <Button 
            icon={<ArrowLeftOutlined />}
            className={styles.backButton}
          >
            Back to List
          </Button>
        </Link>
        
        <div className={styles.actionButtons}>
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
    </div>
  );
};

export default ClimbViewActions;