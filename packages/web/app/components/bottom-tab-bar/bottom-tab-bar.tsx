'use client';

import React, { useState, useMemo } from 'react';
import { Drawer, Spin, Typography } from 'antd';
import { UnorderedListOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { BoardDetails } from '@/app/lib/types';
import { themeTokens } from '@/app/theme/theme-config';
import { useQueueContext } from '../graphql-queue';
import { UISearchParamsProvider, useUISearchParams } from '../queue-control/ui-searchparams-provider';
import { DEFAULT_SEARCH_PARAMS } from '@/app/lib/url-utils';
import SearchForm from '../search-drawer/search-form';
import ClearButton from '../search-drawer/clear-button';
import CreateDrawer from '../create-drawer/create-drawer';
import styles from './bottom-tab-bar.module.css';

const { Text } = Typography;

interface BottomTabBarProps {
  boardDetails: BoardDetails;
}

const SearchDrawerFooter: React.FC = () => {
  const { totalSearchResultCount, isFetchingClimbs } = useQueueContext();
  const { uiSearchParams } = useUISearchParams();

  const hasActiveFilters = Object.entries(uiSearchParams).some(([key, value]) => {
    if (key === 'holdsFilter') {
      return Object.keys(value || {}).length > 0;
    }
    return value !== DEFAULT_SEARCH_PARAMS[key as keyof typeof DEFAULT_SEARCH_PARAMS];
  });

  if (!hasActiveFilters) return null;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${themeTokens.spacing[2]}px ${themeTokens.spacing[4]}px`,
    }}>
      <div>
        {isFetchingClimbs ? (
          <Spin size="small" />
        ) : (
          <Text type="secondary">
            <span style={{ fontWeight: themeTokens.typography.fontWeight.semibold }}>
              {(totalSearchResultCount ?? 0).toLocaleString()}
            </span>{' '}
            results
          </Text>
        )}
      </div>
      <ClearButton />
    </div>
  );
};

const SearchDrawerContent: React.FC<{ boardDetails: BoardDetails; open: boolean; onClose: () => void }> = ({
  boardDetails,
  open,
  onClose,
}) => {
  return (
    <UISearchParamsProvider>
      <Drawer
        title="Search Climbs"
        placement="right"
        size="large"
        open={open}
        onClose={onClose}
        footer={<SearchDrawerFooter />}
        styles={{
          body: { padding: `${themeTokens.spacing[3]}px ${themeTokens.spacing[4]}px ${themeTokens.spacing[4]}px` },
          footer: { padding: 0, border: 'none' },
          wrapper: { width: '90%' },
        }}
      >
        <SearchForm boardDetails={boardDetails} />
      </Drawer>
    </UISearchParamsProvider>
  );
};

const BottomTabBar: React.FC<BottomTabBarProps> = ({ boardDetails }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const pathname = usePathname();

  const activeTab = useMemo((): string => {
    if (pathname.includes('/list')) return 'climbs';
    return 'climbs';
  }, [pathname]);

  const tabs: { key: string; label: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      key: 'climbs',
      label: 'Climbs',
      icon: <UnorderedListOutlined />,
      onClick: () => {
        // Already on climbs list - no-op
      },
    },
    {
      key: 'search',
      label: 'Search',
      icon: <SearchOutlined />,
      onClick: () => setIsSearchOpen(true),
    },
    {
      key: 'create',
      label: 'New',
      icon: <PlusOutlined />,
      onClick: () => setIsCreateOpen(true),
    },
  ];

  return (
    <>
      <div className={styles.tabBar} role="tablist" aria-label="Navigation">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const color = isActive ? themeTokens.colors.primary : themeTokens.neutral[400];
          return (
            <button
              key={tab.key}
              className={styles.tabItem}
              role="tab"
              aria-label={tab.label}
              aria-selected={isActive}
              onClick={tab.onClick}
              style={{ color }}
            >
              <span style={{
                fontSize: themeTokens.typography.fontSize.xl,
                lineHeight: 1,
                transition: `color ${themeTokens.transitions.fast}`,
              }}>
                {tab.icon}
              </span>
              <span
                className={styles.tabLabel}
                style={{ transition: `color ${themeTokens.transitions.fast}` }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <SearchDrawerContent
        boardDetails={boardDetails}
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <CreateDrawer
        boardDetails={boardDetails}
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
};

export default BottomTabBar;
