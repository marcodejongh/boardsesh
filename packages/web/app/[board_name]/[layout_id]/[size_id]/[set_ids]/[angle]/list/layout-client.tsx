'use client';

import React, { useMemo } from 'react';
import { PropsWithChildren } from 'react';
import { Tabs, Badge, Button, Popconfirm } from 'antd';
import Box from '@mui/material/Box';
import { DeleteOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import { themeTokens } from '@/app/theme/theme-config';
import AccordionSearchForm from '@/app/components/search-drawer/accordion-search-form';
import SearchResultsFooter from '@/app/components/search-drawer/search-results-footer';
import QueueList from '@/app/components/queue-control/queue-list';
import { useQueueContext } from '@/app/components/graphql-queue';
import OnboardingTour from '@/app/components/onboarding/onboarding-tour';
import styles from './layout-client.module.css';


interface ListLayoutClientProps {
  boardDetails: BoardDetails;
}

// Isolated component for the queue tab label - subscribes to context independently
const QueueTabLabel: React.FC = () => {
  const { queue } = useQueueContext();
  return (
    <Badge count={queue.length} overflowCount={99} showZero={false} size="small" color={themeTokens.colors.primary} offset={[8, -2]}>
      Queue
    </Badge>
  );
};

// Isolated component for the queue tab content - subscribes to context independently
const QueueTabContent: React.FC<{ boardDetails: BoardDetails }> = ({ boardDetails }) => {
  const { queue, setQueue } = useQueueContext();

  const handleClearQueue = () => {
    setQueue([]);
    track('Queue Cleared', {
      boardLayout: boardDetails.layout_name || '',
      itemsCleared: queue.length,
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {queue.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 8px 0 8px' }}>
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
        </Box>
      )}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <QueueList boardDetails={boardDetails} />
      </div>
    </div>
  );
};

const TabsWrapper: React.FC<{ boardDetails: BoardDetails }> = ({ boardDetails }) => {
  // Memoize tabItems to prevent recreating the array on every render
  // Child components (QueueTabLabel, QueueTabContent) handle their own context subscriptions
  const tabItems = useMemo(
    () => [
      {
        key: 'queue',
        label: <QueueTabLabel />,
        children: <QueueTabContent boardDetails={boardDetails} />,
      },
      {
        key: 'search',
        label: 'Search',
        children: (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <AccordionSearchForm boardDetails={boardDetails} />
            </div>
            <SearchResultsFooter />
          </div>
        ),
      },
    ],
    [boardDetails],
  );

  return <Tabs defaultActiveKey="queue" items={tabItems} className={styles.siderTabs} />;
};

const ListLayoutClient: React.FC<PropsWithChildren<ListLayoutClientProps>> = ({ boardDetails, children }) => {
  return (
    <Box className={styles.listLayout}>
      <Box component="main" className={styles.mainContent}>{children}</Box>
      <Box component="aside" className={styles.sider} sx={{ width: 400, padding: '0 8px 20px 8px' }}>
        <TabsWrapper boardDetails={boardDetails} />
      </Box>
      <OnboardingTour />
    </Box>
  );
};

export default ListLayoutClient;
