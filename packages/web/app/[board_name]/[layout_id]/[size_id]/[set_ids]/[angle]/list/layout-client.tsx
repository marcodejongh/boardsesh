'use client';

import React from 'react';
import { PropsWithChildren } from 'react';
import { Layout, Tabs, Badge, Button, Popconfirm, Flex } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import { themeTokens } from '@/app/theme/theme-config';
import BasicSearchForm from '@/app/components/search-drawer/basic-search-form';
import ClimbHoldSearchForm from '@/app/components/search-drawer/climb-hold-search-form';
import SearchResultsFooter from '@/app/components/search-drawer/search-results-footer';
import QueueList from '@/app/components/queue-control/queue-list';
import { UISearchParamsProvider } from '@/app/components/queue-control/ui-searchparams-provider';
import { useQueueContext } from '@/app/components/graphql-queue';
import styles from './layout-client.module.css';

const { Content, Sider } = Layout;

interface ListLayoutClientProps {
  boardDetails: BoardDetails;
}

const TabsWrapper: React.FC<{ boardDetails: BoardDetails }> = ({ boardDetails }) => {
  const { queue, setQueue } = useQueueContext();

  const handleClearQueue = () => {
    setQueue([]);
    track('Queue Cleared', {
      boardLayout: boardDetails.layout_name || '',
      itemsCleared: queue.length,
    });
  };

  const tabItems = [
    {
      key: 'queue',
      label: (
        <Badge
          count={queue.length}
          overflowCount={99}
          showZero={false}
          size="small"
          color="cyan"
          offset={[8, -2]}
        >
          Queue
        </Badge>
      ),
      children: (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {queue.length > 0 && (
            <Flex justify="flex-end" style={{ padding: '8px 8px 0 8px' }}>
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
            </Flex>
          )}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <QueueList boardDetails={boardDetails} />
          </div>
        </div>
      ),
    },
    {
      key: 'search',
      label: 'Search',
      children: (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <BasicSearchForm boardDetails={boardDetails} />
          </div>
          <SearchResultsFooter />
        </div>
      ),
    },
    {
      key: 'holds',
      label: 'Search by Hold',
      children: (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ClimbHoldSearchForm boardDetails={boardDetails} />
          </div>
          <SearchResultsFooter />
        </div>
      ),
    },
  ];

  return <Tabs defaultActiveKey="queue" items={tabItems} className={styles.siderTabs} />;
};

const ListLayoutClient: React.FC<PropsWithChildren<ListLayoutClientProps>> = ({ boardDetails, children }) => {
  return (
    <Layout className={styles.listLayout}>
      <Content className={styles.mainContent}>{children}</Content>
      <Sider width={400} className={styles.sider} theme="light" style={{ padding: '0 8px 20px 8px' }}>
        <UISearchParamsProvider>
          <TabsWrapper boardDetails={boardDetails} />
        </UISearchParamsProvider>
      </Sider>
    </Layout>
  );
};

export default ListLayoutClient;
