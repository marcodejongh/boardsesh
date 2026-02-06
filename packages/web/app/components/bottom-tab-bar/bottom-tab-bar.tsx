'use client';

import React, { useState } from 'react';
import { Drawer, Button, Flex } from 'antd';
import { UnorderedListOutlined, SearchOutlined, PlusOutlined, TagOutlined, EditOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import SearchForm from '../search-drawer/search-form';
import SearchResultsFooter from '../search-drawer/search-results-footer';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './bottom-tab-bar.module.css';

type Tab = 'climbs' | 'search' | 'create';

interface BottomTabBarProps {
  boardDetails: BoardDetails;
  angle: number;
}

function BottomTabBarInner({ boardDetails, angle }: BottomTabBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const pathname = usePathname();

  const isListPage = pathname.includes('/list');

  const getActiveTab = (): Tab => {
    if (isSearchOpen) return 'search';
    if (isCreateOpen) return 'create';
    if (isListPage) return 'climbs';
    return 'climbs';
  };

  const activeTab = getActiveTab();

  const listUrl = (() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }
    return null;
  })();

  const createClimbUrl = (() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return `/${board_name}/${generateLayoutSlug(layout_name)}/${generateSizeSlug(size_name, size_description)}/${generateSetSlug(set_names)}/${angle}/create`;
    }
    return null;
  })();

  const playlistsUrl = (() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return `/${board_name}/${generateLayoutSlug(layout_name)}/${generateSizeSlug(size_name, size_description)}/${generateSetSlug(set_names)}/${angle}/playlists`;
    }
    return null;
  })();

  const handleSearchTab = () => {
    setIsCreateOpen(false);
    setIsSearchOpen(true);
    track('Bottom Tab Bar', { tab: 'search' });
  };

  const handleCreateTab = () => {
    setIsSearchOpen(false);
    setIsCreateOpen(true);
    track('Bottom Tab Bar', { tab: 'create' });
  };

  const handleClimbsTab = () => {
    setIsSearchOpen(false);
    setIsCreateOpen(false);
    track('Bottom Tab Bar', { tab: 'climbs' });
  };

  const getTabColor = (tab: Tab) =>
    activeTab === tab ? themeTokens.colors.primary : themeTokens.neutral[400];

  return (
    <>
      <div className={styles.tabBar}>
        {/* Climbs tab */}
        {listUrl ? (
          <Link href={listUrl} className={styles.tabItem} onClick={handleClimbsTab} style={{ color: getTabColor('climbs'), textDecoration: 'none' }}>
            <UnorderedListOutlined style={{ fontSize: 20 }} />
            <span className={styles.tabLabel}>Climbs</span>
          </Link>
        ) : (
          <button className={styles.tabItem} onClick={handleClimbsTab} style={{ color: getTabColor('climbs') }}>
            <UnorderedListOutlined style={{ fontSize: 20 }} />
            <span className={styles.tabLabel}>Climbs</span>
          </button>
        )}

        {/* Search tab */}
        <button
          className={styles.tabItem}
          onClick={handleSearchTab}
          style={{ color: getTabColor('search') }}
          aria-label="Search climbs"
          role="tab"
          aria-selected={activeTab === 'search'}
        >
          <SearchOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Search</span>
        </button>

        {/* Create tab */}
        <button
          className={styles.tabItem}
          onClick={handleCreateTab}
          style={{ color: getTabColor('create') }}
          aria-label="Create new"
          role="tab"
          aria-selected={activeTab === 'create'}
        >
          <PlusOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>New</span>
        </button>
      </div>

      {/* Search Drawer */}
      <Drawer
        title="Search Climbs"
        placement="right"
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        footer={<SearchResultsFooter />}
        styles={{
          body: { padding: `${themeTokens.spacing[3]}px ${themeTokens.spacing[4]}px ${themeTokens.spacing[4]}px` },
          footer: { padding: 0, border: 'none' },
          wrapper: { width: '90%' },
        }}
      >
        <SearchForm boardDetails={boardDetails} />
      </Drawer>

      {/* Create Drawer */}
      <Drawer
        title="Create"
        placement="bottom"
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        styles={{
          wrapper: { height: 'auto' },
          body: { padding: `${themeTokens.spacing[2]}px 0` },
        }}
      >
        <Flex vertical>
          {createClimbUrl && (
            <Link
              href={createClimbUrl}
              onClick={() => setIsCreateOpen(false)}
              style={{ textDecoration: 'none' }}
            >
              <Button
                type="text"
                icon={<EditOutlined />}
                block
                style={{
                  height: 48,
                  justifyContent: 'flex-start',
                  paddingLeft: themeTokens.spacing[4],
                  fontSize: themeTokens.typography.fontSize.base,
                  color: 'inherit',
                }}
              >
                Create Climb
              </Button>
            </Link>
          )}
          {playlistsUrl && (
            <Link
              href={playlistsUrl}
              onClick={() => setIsCreateOpen(false)}
              style={{ textDecoration: 'none' }}
            >
              <Button
                type="text"
                icon={<TagOutlined />}
                block
                style={{
                  height: 48,
                  justifyContent: 'flex-start',
                  paddingLeft: themeTokens.spacing[4],
                  fontSize: themeTokens.typography.fontSize.base,
                  color: 'inherit',
                }}
              >
                My Playlists
              </Button>
            </Link>
          )}
        </Flex>
      </Drawer>
    </>
  );
}

const BottomTabBar: React.FC<BottomTabBarProps> = (props) => {
  return (
    <UISearchParamsProvider>
      <BottomTabBarInner {...props} />
    </UISearchParamsProvider>
  );
};

export default BottomTabBar;
