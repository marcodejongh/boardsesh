'use client';

import React from 'react';
import { PropsWithChildren } from 'react';
import { Layout, Tabs } from 'antd';
import { BoardDetails } from '@/app/lib/types';
import SearchForm from '@/app/components/search-drawer/search-form';
import QueueList from '@/app/components/queue-control/queue-list';
import { UISearchParamsProvider } from '@/app/components/queue-control/ui-searchparams-provider';
import styles from './layout-client.module.css';

const { Content, Sider } = Layout;

interface ListLayoutClientProps {
  boardDetails: BoardDetails;
}

const ListLayoutClient: React.FC<PropsWithChildren<ListLayoutClientProps>> = ({ boardDetails, children }) => {
  const tabItems = [
    {
      key: 'search',
      label: 'Search',
      children: (
        <UISearchParamsProvider>
          <SearchForm boardDetails={boardDetails} />
        </UISearchParamsProvider>
      ),
    },
    {
      key: 'queue',
      label: 'Queue',
      children: <QueueList boardDetails={boardDetails} />,
    },
  ];

  return (
    <Layout className={styles.listLayout}>
      <Content className={styles.mainContent}>{children}</Content>
      <Sider width={320} className={styles.sider} theme="light">
        <Tabs defaultActiveKey="search" items={tabItems} className={styles.siderTabs} />
      </Sider>
    </Layout>
  );
};

export default ListLayoutClient;
