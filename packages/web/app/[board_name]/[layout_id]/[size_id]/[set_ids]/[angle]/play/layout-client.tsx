'use client';

import React from 'react';
import { PropsWithChildren } from 'react';
import { Layout, Tabs, Badge, Button, Popconfirm, Flex } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import { themeTokens } from '@/app/theme/theme-config';
import QueueList from '@/app/components/queue-control/queue-list';
import { useQueueContext } from '@/app/components/graphql-queue';
import styles from './layout-client.module.css';

const { Content, Sider } = Layout;

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
            color="cyan"
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
    <Layout className={styles.playLayout}>
      <Content className={styles.mainContent}>{children}</Content>
      <Sider width={400} className={styles.sider} theme="light">
        <QueueSidebar boardDetails={boardDetails} />
      </Sider>
    </Layout>
  );
};

export default PlayLayoutClient;
