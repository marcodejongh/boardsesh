'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Spin, List, Tabs } from 'antd';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  LabelOutlined,
  AddOutlined,
  ChevronRightOutlined,
  PublicOutlined,
  LockOutlined,
  SentimentDissatisfiedOutlined,
  LoginOutlined,
  ExploreOutlined,
} from '@mui/icons-material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { BoardDetails } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_USER_PLAYLISTS,
  GetUserPlaylistsQueryResponse,
  GetUserPlaylistsInput,
  Playlist,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { constructClimbListWithSlugs, generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import BackButton from '@/app/components/back-button';
import AuthModal from '@/app/components/auth/auth-modal';
import DiscoverPlaylistsContent from './discover-playlists-content';
import styles from './playlists.module.css';

// Typography destructuring removed - using MUI Typography directly

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

type PlaylistsListContentProps = {
  boardDetails: BoardDetails;
  angle: number;
};

export default function PlaylistsListContent({
  boardDetails,
  angle,
}: PlaylistsListContentProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { token, isLoading: tokenLoading } = useWsAuthToken();

  const isAuthenticated = sessionStatus === 'authenticated';

  const fetchPlaylists = useCallback(async () => {
    if (tokenLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await executeGraphQL<GetUserPlaylistsQueryResponse, { input: GetUserPlaylistsInput }>(
        GET_USER_PLAYLISTS,
        {
          input: {
            boardType: boardDetails.board_name,
            layoutId: boardDetails.layout_id,
          },
        },
        token,
      );

      setPlaylists(response.userPlaylists);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  }, [boardDetails.board_name, boardDetails.layout_id, token, tokenLoading, isAuthenticated]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }

    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
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

  const getPlaylistColor = (playlist: Playlist) => {
    if (playlist.color && isValidHexColor(playlist.color)) {
      return playlist.color;
    }
    return themeTokens.colors.primary;
  };

  if (error) {
    return (
      <>
        <div className={styles.actionsSection}>
          <BackButton fallbackUrl={getBackToListUrl()} />
        </div>
        <div className={styles.errorContainer}>
          <SentimentDissatisfiedOutlined className={styles.errorIcon} />
          <div className={styles.errorTitle}>Unable to Load Playlists</div>
          <div className={styles.errorMessage}>
            There was an error loading your playlists. Please try again.
          </div>
          <MuiButton variant="outlined" onClick={fetchPlaylists}>Try Again</MuiButton>
        </div>
      </>
    );
  }

  // Render the "Your playlists" content
  const renderYourPlaylists = () => {
    // Not authenticated
    if (!isAuthenticated && sessionStatus !== 'loading') {
      return (
        <div className={styles.emptyContainer}>
          <LabelOutlined className={styles.emptyIcon} />
          <Typography variant="h6" component="h4" className={styles.emptyTitle}>Sign in to view your playlists</Typography>
          <Typography variant="body2" component="span" color="text.secondary" className={styles.emptyText}>
            Create and manage your own climb playlists by signing in.
          </Typography>
          <MuiButton
            variant="contained"
            startIcon={<LoginOutlined />}
            onClick={() => setShowAuthModal(true)}
            sx={{ marginTop: `${themeTokens.spacing[4]}px` }}
          >
            Sign In
          </MuiButton>
        </div>
      );
    }

    if (loading || tokenLoading || sessionStatus === 'loading') {
      return (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      );
    }

    if (playlists.length === 0) {
      return (
        <div className={styles.emptyContainer}>
          <LabelOutlined className={styles.emptyIcon} />
          <Typography variant="h6" component="h4" className={styles.emptyTitle}>No playlists yet</Typography>
          <Typography variant="body2" component="span" color="text.secondary" className={styles.emptyText}>
            Create your first playlist by adding climbs from the climb list.
          </Typography>
          <Link href={getBackToListUrl()}>
            <MuiButton
              variant="contained"
              startIcon={<AddOutlined />}
              sx={{ marginTop: `${themeTokens.spacing[4]}px` }}
            >
              Browse Climbs
            </MuiButton>
          </Link>
        </div>
      );
    }

    return (
      <div className={styles.listSection}>
        <List
          dataSource={playlists}
          renderItem={(playlist) => (
            <Link href={getPlaylistUrl(playlist.uuid)} className={styles.playlistLink}>
              <List.Item className={styles.playlistItem}>
                <div className={styles.playlistItemContent}>
                  <div
                    className={styles.playlistColor}
                    style={{ backgroundColor: getPlaylistColor(playlist) }}
                  >
                    <LabelOutlined className={styles.playlistColorIcon} />
                  </div>
                  <div className={styles.playlistInfo}>
                    <div className={styles.playlistName}>{playlist.name}</div>
                    <div className={styles.playlistMeta}>
                      <span>{playlist.climbCount} {playlist.climbCount === 1 ? 'climb' : 'climbs'}</span>
                      <span className={styles.metaDot}>·</span>
                      {playlist.isPublic ? (
                        <span className={styles.visibilityText}>
                          <PublicOutlined /> Public
                        </span>
                      ) : (
                        <span className={styles.visibilityText}>
                          <LockOutlined /> Private
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRightOutlined className={styles.playlistArrow} />
              </List.Item>
            </Link>
          )}
        />
      </div>
    );
  };

  const tabItems = [
    {
      key: 'your',
      label: (
        <span>
          <LabelOutlined />
          Your playlists
        </span>
      ),
      children: (
        <div className={styles.contentWrapper}>
          {renderYourPlaylists()}
        </div>
      ),
    },
    {
      key: 'discover',
      label: (
        <span>
          <ExploreOutlined />
          Discover
        </span>
      ),
      children: (
        <DiscoverPlaylistsContent
          boardDetails={boardDetails}
          angle={angle}
        />
      ),
    },
  ];

  return (
    <>
      {/* Actions Section */}
      <div className={styles.actionsSection}>
        <div className={styles.actionsContainer}>
          <BackButton fallbackUrl={getBackToListUrl()} />
          <Typography variant="h6" component="h4" sx={{ margin: 0 }}>Playlists</Typography>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <Tabs
          defaultActiveKey="your"
          items={tabItems}
          className={styles.playlistTabs}
        />
      </div>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to Boardsesh"
        description="Sign in to create and manage your climb playlists."
      />
    </>
  );
}
