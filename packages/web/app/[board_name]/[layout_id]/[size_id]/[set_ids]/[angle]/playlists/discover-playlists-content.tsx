'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Spin, Typography, List, Input, Form, Button } from 'antd';
import {
  TagOutlined,
  SearchOutlined,
  RightOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { BoardDetails } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  DISCOVER_PLAYLISTS,
  DiscoverPlaylistsQueryResponse,
  DiscoverPlaylistsInput,
  DiscoverablePlaylist,
} from '@/app/lib/graphql/operations/playlists';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import CreatorNameSelect from './creator-name-select';
import styles from './playlists.module.css';

const { Title, Text } = Typography;

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

type DiscoverPlaylistsContentProps = {
  boardDetails: BoardDetails;
  angle: number;
};

export default function DiscoverPlaylistsContent({
  boardDetails,
  angle,
}: DiscoverPlaylistsContentProps) {
  const [playlists, setPlaylists] = useState<DiscoverablePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [debouncedSearchName, setDebouncedSearchName] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const isInitialLoad = useRef(true);

  // Debounce search name
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchName(searchName);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchName]);

  // Reset pagination when filters change
  useEffect(() => {
    if (!isInitialLoad.current) {
      setPage(0);
      setPlaylists([]);
    }
    isInitialLoad.current = false;
  }, [debouncedSearchName, selectedCreators]);

  const fetchPlaylists = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const input: DiscoverPlaylistsInput = {
        boardType: boardDetails.board_name,
        layoutId: boardDetails.layout_id,
        name: debouncedSearchName || undefined,
        creatorIds: selectedCreators.length > 0 ? selectedCreators : undefined,
        page: pageNum,
        pageSize: PAGE_SIZE,
      };

      const response = await executeGraphQL<DiscoverPlaylistsQueryResponse, { input: DiscoverPlaylistsInput }>(
        DISCOVER_PLAYLISTS,
        { input },
        undefined // No auth token needed for public discovery
      );

      const newPlaylists = response.discoverPlaylists.playlists;
      setHasMore(response.discoverPlaylists.hasMore);

      if (append) {
        setPlaylists(prev => [...prev, ...newPlaylists]);
      } else {
        setPlaylists(newPlaylists);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [boardDetails.board_name, boardDetails.layout_id, debouncedSearchName, selectedCreators]);

  // Fetch when filters change (page 0)
  useEffect(() => {
    fetchPlaylists(0, false);
  }, [debouncedSearchName, selectedCreators, boardDetails.board_name, boardDetails.layout_id]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPlaylists(nextPage, true);
  };

  const getPlaylistUrl = (playlistUuid: string) => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    if (layout_name && size_name && set_names) {
      const layoutSlug = generateLayoutSlug(layout_name);
      const sizeSlug = generateSizeSlug(size_name, size_description);
      const setSlug = generateSetSlug(set_names);
      return `/${board_name}/${layoutSlug}/${sizeSlug}/${setSlug}/${angle}/playlist/${playlistUuid}`;
    }

    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/playlist/${playlistUuid}`;
  };

  const getPlaylistColor = (playlist: DiscoverablePlaylist) => {
    if (playlist.color && isValidHexColor(playlist.color)) {
      return playlist.color;
    }
    return themeTokens.colors.primary;
  };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorTitle}>Unable to Load Playlists</div>
        <div className={styles.errorMessage}>
          There was an error loading playlists. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contentWrapper}>
      {/* Search Filters */}
      <div className={styles.searchFilters}>
        <Form layout="vertical">
          <Form.Item label="Search by name" style={{ marginBottom: 12 }}>
            <Input
              placeholder="Search playlists..."
              prefix={<SearchOutlined />}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              allowClear
            />
          </Form.Item>
          <Form.Item label="Filter by creator" style={{ marginBottom: 0 }}>
            <CreatorNameSelect
              boardType={boardDetails.board_name}
              layoutId={boardDetails.layout_id}
              value={selectedCreators}
              onChange={setSelectedCreators}
            />
          </Form.Item>
        </Form>
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      ) : playlists.length === 0 ? (
        <div className={styles.emptyContainer}>
          <TagOutlined className={styles.emptyIcon} />
          <Title level={4} className={styles.emptyTitle}>No public playlists found</Title>
          <Text type="secondary" className={styles.emptyText}>
            {debouncedSearchName || selectedCreators.length > 0
              ? 'Try adjusting your search filters.'
              : 'Be the first to share a playlist for this board!'}
          </Text>
        </div>
      ) : (
        <div className={styles.listSection}>
          <List
            dataSource={playlists}
            loadMore={
              hasMore ? (
                <div className={styles.loadMoreContainer}>
                  <Button
                    onClick={handleLoadMore}
                    loading={loadingMore}
                  >
                    Load more
                  </Button>
                </div>
              ) : null
            }
            renderItem={(playlist) => (
              <Link href={getPlaylistUrl(playlist.uuid)} className={styles.playlistLink}>
                <List.Item className={styles.playlistItem}>
                  <div className={styles.playlistItemContent}>
                    <div
                      className={styles.playlistColor}
                      style={{ backgroundColor: getPlaylistColor(playlist) }}
                    >
                      <TagOutlined className={styles.playlistColorIcon} />
                    </div>
                    <div className={styles.playlistInfo}>
                      <div className={styles.playlistName}>{playlist.name}</div>
                      <div className={styles.playlistMeta}>
                        <span>{playlist.climbCount} {playlist.climbCount === 1 ? 'climb' : 'climbs'}</span>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.creatorText}>
                          <UserOutlined /> {playlist.creatorName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <RightOutlined className={styles.playlistArrow} />
                </List.Item>
              </Link>
            )}
          />
        </div>
      )}
    </div>
  );
}
