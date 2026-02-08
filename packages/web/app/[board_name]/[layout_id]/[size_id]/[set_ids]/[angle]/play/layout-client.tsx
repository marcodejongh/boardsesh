'use client';

import React from 'react';
import { PropsWithChildren } from 'react';
import { Tabs, Badge, Button, Popconfirm } from 'antd';
import Box from '@mui/material/Box';
import { DeleteOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import { themeTokens } from '@/app/theme/theme-config';
import QueueList from '@/app/components/queue-control/queue-list';
import { useQueueContext } from '@/app/components/graphql-queue';
import styles from './layout-client.module.css';


interface PlayLayoutClientProps {
  boardDetails: BoardDetails;
}

const QueueSidebar: React.FC<{ boardDetails: BoardDetails }> = ({ boardDetails }) => {
  const { queue, setQueue } = useQueueContext();

  const handleClearQueue = () => {
    setQueue([]);
    track('Queue Cleared', {
      boardLayout: boardDetails.layout_name || '',
      itemsCleared: queue.length,
    });
  };

  return (
    <div className={styles.sidebarContent}>
      <div className={styles.sidebarHeader}>
        <h3 className={styles.sidebarTitle}>
          <Badge
            count={queue.length}
            overflowCount={99}
            showZero={false}
            size="small"
            color={themeTokens.colors.primary}
            offset={[8, 0]}
          >
            Queue
          </Badge>
        </h3>
        {queue.length > 0 && (
          <Popconfirm
            title="Clear queue"
            description="Are you sure you want to clear all items from the queue?"
            onConfirm={handleClearQueue}
            okText="Clear"
            cancelText="Cancel"
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" style={{ color: themeTokens.neutral[400] }}>
              Clear
            </Button>
          </Popconfirm>
        )}
      </div>
      <div className={styles.queueListWrapper}>
        <QueueList boardDetails={boardDetails} />
      </div>
    </div>
  );
};

const PlayLayoutClient: React.FC<PropsWithChildren<PlayLayoutClientProps>> = ({ boardDetails, children }) => {
  return (
    <Box className={styles.playLayout}>
      <Box component="main" className={styles.mainContent}>{children}</Box>
      <Box component="aside" className={styles.sider} sx={{ width: 400 }}>
        <QueueSidebar boardDetails={boardDetails} />
      </Box>
    </Box>
  );
};

export default PlayLayoutClient;
