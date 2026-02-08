'use client';

import React, { useState } from 'react';
import { PropsWithChildren } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import MuiButton from '@mui/material/Button';
import Box from '@mui/material/Box';
import { DeleteOutlined } from '@mui/icons-material';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import { themeTokens } from '@/app/theme/theme-config';
import AccordionSearchForm from '@/app/components/search-drawer/accordion-search-form';
import SearchResultsFooter from '@/app/components/search-drawer/search-results-footer';
import QueueList from '@/app/components/queue-control/queue-list';
import { useQueueContext } from '@/app/components/graphql-queue';
import { ConfirmPopover } from '@/app/components/ui/confirm-popover';
import { TabPanel } from '@/app/components/ui/tab-panel';
import OnboardingTour from '@/app/components/onboarding/onboarding-tour';
import styles from './layout-client.module.css';


interface ListLayoutClientProps {
  boardDetails: BoardDetails;
}

// Isolated component for the queue tab label - subscribes to context independently
const QueueTabLabel: React.FC = () => {
  const { queue } = useQueueContext();
  return (
    <Badge badgeContent={queue.length} max={99} invisible={queue.length === 0} color="primary" sx={{ '& .MuiBadge-badge': { right: -8, top: -2 } }}>
      Queue
    </Badge>
  );
};

// Isolated component for the queue tab content - subscribes to context independently
const QueueTabContent: React.FC<{ boardDetails: BoardDetails }> = ({ boardDetails }) => {
  const { queue, setQueue } = useQueueContext();
  const [scrollContainerEl, setScrollContainerEl] = useState<HTMLDivElement | null>(null);

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
          <ConfirmPopover
            title="Clear queue"
            description="Are you sure you want to clear all items from the queue?"
            onConfirm={handleClearQueue}
            okText="Clear"
            cancelText="Cancel"
          >
            <MuiButton variant="text" startIcon={<DeleteOutlined />} size="small" sx={{ color: themeTokens.neutral[400] }}>
              Clear
            </MuiButton>
          </ConfirmPopover>
        </Box>
      )}
      <div ref={setScrollContainerEl} style={{ flex: 1, overflow: 'auto' }}>
        <QueueList boardDetails={boardDetails} scrollContainer={scrollContainerEl} />
      </div>
    </div>
  );
};

const TabsWrapper: React.FC<{ boardDetails: BoardDetails }> = ({ boardDetails }) => {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} className={styles.siderTabs}>
        <Tab label={<QueueTabLabel />} value="queue" />
        <Tab label="Search" value="search" />
      </Tabs>
      <TabPanel value={activeTab} index="queue">
        <QueueTabContent boardDetails={boardDetails} />
      </TabPanel>
      <TabPanel value={activeTab} index="search">
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <AccordionSearchForm boardDetails={boardDetails} />
          </div>
          <SearchResultsFooter />
        </div>
      </TabPanel>
    </>
  );
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
