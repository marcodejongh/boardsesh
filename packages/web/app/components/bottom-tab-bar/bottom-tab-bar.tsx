'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import MuiButton from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import { usePlaylistsContext } from '../climb-actions/playlists-batch-context';
import AuthModal from '../auth/auth-modal';
import { getTabNavigationState, saveTabNavigationState } from '@/app/lib/tab-navigation-db';
import styles from './bottom-tab-bar.module.css';

type Tab = 'climbs' | 'library' | 'create';

interface BottomTabBarProps {
  boardDetails: BoardDetails;
  angle: number;
}

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

// Determine which tab a path clearly belongs to.
// Returns null for ambiguous pages (view/play) that could be reached from either tab.
const getTabForPath = (path: string): Tab | null => {
  if (path.includes('/playlists') || path.includes('/playlist/')) return 'library';
  if (path.includes('/list') || path.includes('/import')) return 'climbs';
  if (path.includes('/create')) return 'create';
  return null;
};

// Get the board route base path (e.g., /kilter/original/12x12/led/40)
const getBasePath = (path: string): string => {
  return path.split('/').slice(0, 6).join('/');
};

const INITIAL_PLAYLIST_FORM = { name: '', description: '', color: '' };

function BottomTabBar({ boardDetails, angle }: BottomTabBarProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [playlistFormValues, setPlaylistFormValues] = useState(INITIAL_PLAYLIST_FORM);
  const [playlistFormErrors, setPlaylistFormErrors] = useState<Record<string, string>>({});
  const pathname = usePathname();
  const router = useRouter();

  const { createPlaylist, isAuthenticated } = usePlaylistsContext();
  const { showMessage } = useSnackbar();

  // Hide playlists for moonboard (not yet supported)
  const isMoonboard = boardDetails.board_name === 'moonboard';

  // --- Tab navigation state ---
  // Ref tracks the "true" active tab (survives across ambiguous pages like /view/ and /play/)
  const currentTabRef = useRef<Tab>(getTabForPath(pathname) ?? 'climbs');
  // State for rendering (triggers re-renders when active tab changes)
  const [resolvedTab, setResolvedTab] = useState<Tab>(getTabForPath(pathname) ?? 'climbs');
  // Store last visited URL per tab
  const lastUrlsRef = useRef<Record<string, string>>({});

  // Build default tab root URLs
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

  const getPlaylistUrl = useCallback((playlistUuid: string) => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return `/${board_name}/${generateLayoutSlug(layout_name)}/${generateSizeSlug(size_name, size_description)}/${generateSetSlug(set_names)}/${angle}/playlist/${playlistUuid}`;
    }
    return null;
  }, [boardDetails, angle]);

  // Initialize from IndexedDB on mount
  useEffect(() => {
    const basePath = getBasePath(pathname);
    getTabNavigationState(basePath).then((stored) => {
      if (!stored) return;
      if (stored.lastUrls) {
        for (const [tab, url] of Object.entries(stored.lastUrls)) {
          if (url.startsWith(basePath)) {
            lastUrlsRef.current[tab] = url;
          }
        }
      }
      // Restore active tab for ambiguous pages (view/play)
      if (stored.activeTab && !getTabForPath(pathname)) {
        currentTabRef.current = stored.activeTab as Tab;
        setResolvedTab(stored.activeTab as Tab);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track pathname changes: update active tab and store last URL
  useEffect(() => {
    const tab = getTabForPath(pathname);
    if (tab) {
      currentTabRef.current = tab;
      setResolvedTab(tab);
    }

    // Store the current URL as the last URL for the active tab
    const activeTab = currentTabRef.current;
    if (activeTab !== 'create') {
      const fullPath = pathname + (typeof window !== 'undefined' ? window.location.search : '');
      lastUrlsRef.current[activeTab] = fullPath;
    }

    // Persist to IndexedDB
    const basePath = getBasePath(pathname);
    saveTabNavigationState(basePath, {
      activeTab: currentTabRef.current,
      lastUrls: { ...lastUrlsRef.current },
    });
  }, [pathname]);

  // Active tab for rendering: drawer state takes priority
  const activeTab = (isCreateOpen || isCreatePlaylistOpen) ? 'create' : resolvedTab;

  const handleClimbsTab = () => {
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(false);
    const url = lastUrlsRef.current.climbs || listUrl;
    if (url) {
      const currentUrl = pathname + window.location.search;
      if (url !== currentUrl) {
        router.push(url);
      }
    }
    track('Bottom Tab Bar', { tab: 'climbs' });
  };

  const handleLibraryTab = () => {
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(false);
    const url = lastUrlsRef.current.library || playlistsUrl;
    if (url) {
      const currentUrl = pathname + window.location.search;
      if (url !== currentUrl) {
        router.push(url);
      }
    }
    track('Bottom Tab Bar', { tab: 'library' });
  };

  const handleCreateTab = () => {
    setIsCreateOpen(true);
    track('Bottom Tab Bar', { tab: 'create' });
  };

  const handleOpenCreatePlaylist = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(true);
  };

  const validatePlaylistForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!playlistFormValues.name.trim()) {
      errors.name = 'Please enter a playlist name';
    } else if (playlistFormValues.name.length > 100) {
      errors.name = 'Name too long';
    }
    if (playlistFormValues.description.length > 500) {
      errors.description = 'Description too long';
    }
    setPlaylistFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePlaylist = useCallback(async () => {
    if (!validatePlaylistForm()) {
      return;
    }

    try {
      setIsCreatingPlaylist(true);

      // Extract and validate hex color
      let colorHex: string | undefined;
      if (playlistFormValues.color && isValidHexColor(playlistFormValues.color)) {
        colorHex = playlistFormValues.color;
      }

      const newPlaylist = await createPlaylist(playlistFormValues.name, playlistFormValues.description, colorHex, undefined);

      showMessage(`Created playlist "${playlistFormValues.name}"`, 'success');
      track('Create Playlist', {
        boardName: boardDetails.board_name,
        playlistName: playlistFormValues.name,
        source: 'bottom-tab-bar',
      });

      setPlaylistFormValues(INITIAL_PLAYLIST_FORM);
      setPlaylistFormErrors({});
      setIsCreatePlaylistOpen(false);

      // Navigate to the new playlist
      const newPlaylistUrl = getPlaylistUrl(newPlaylist.uuid);
      if (newPlaylistUrl) {
        router.push(newPlaylistUrl);
      }
    } catch (error) {
      showMessage('Failed to create playlist', 'error');
    } finally {
      setIsCreatingPlaylist(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistFormValues, createPlaylist, boardDetails.board_name, router, getPlaylistUrl, showMessage]);

  const getTabColor = (tab: Tab) =>
    activeTab === tab ? themeTokens.colors.primary : themeTokens.neutral[400];

  return (
    <>
      <div className={styles.tabBar}>
        {/* Climbs tab */}
        <button
          className={styles.tabItem}
          onClick={handleClimbsTab}
          style={{ color: getTabColor('climbs') }}
          aria-label="Climbs"
          role="tab"
          aria-selected={activeTab === 'climbs'}
          disabled={!listUrl}
        >
          <FormatListBulletedOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Climb</span>
        </button>

        {/* Your Library tab */}
        <button
          className={styles.tabItem}
          onClick={handleLibraryTab}
          style={{ color: getTabColor('library') }}
          aria-label="Your library"
          role="tab"
          aria-selected={activeTab === 'library'}
          disabled={!playlistsUrl}
        >
          <LocalOfferOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Your Library</span>
        </button>

        {/* Create tab */}
        <button
          className={styles.tabItem}
          onClick={handleCreateTab}
          style={{ color: getTabColor('create') }}
          aria-label="Create"
          role="tab"
          aria-selected={activeTab === 'create'}
        >
          <AddOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Create</span>
        </button>
      </div>

      {/* Create Menu Drawer */}
      <SwipeableDrawer
        title="Create"
        placement="bottom"
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        styles={{
          wrapper: { height: 'auto' },
          body: { padding: `${themeTokens.spacing[2]}px 0` },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {createClimbUrl && (
            <Link
              href={createClimbUrl}
              onClick={() => setIsCreateOpen(false)}
              style={{ textDecoration: 'none' }}
            >
              <MuiButton
                variant="text"
                startIcon={<EditOutlined />}
                fullWidth
                sx={{
                  height: 48,
                  justifyContent: 'flex-start',
                  paddingLeft: themeTokens.spacing[4],
                  fontSize: themeTokens.typography.fontSize.base,
                  color: 'inherit',
                }}
              >
                Climb
              </MuiButton>
            </Link>
          )}
          {!isMoonboard && (
            <MuiButton
              variant="text"
              startIcon={<LocalOfferOutlined />}
              fullWidth
              onClick={handleOpenCreatePlaylist}
              sx={{
                height: 48,
                justifyContent: 'flex-start',
                paddingLeft: themeTokens.spacing[4],
                fontSize: themeTokens.typography.fontSize.base,
              }}
            >
              Playlist
            </MuiButton>
          )}
        </Box>
      </SwipeableDrawer>

      {/* Create Playlist Drawer */}
      <SwipeableDrawer
        title="Create Playlist"
        placement="bottom"
        open={isCreatePlaylistOpen}
        onClose={() => {
          setIsCreatePlaylistOpen(false);
          setPlaylistFormValues(INITIAL_PLAYLIST_FORM);
          setPlaylistFormErrors({});
        }}
        styles={{
          wrapper: { height: 'auto' },
          body: { padding: themeTokens.spacing[4] },
        }}
        extra={
          <MuiButton
            variant="contained"
            onClick={handleCreatePlaylist}
            disabled={isCreatingPlaylist}
          >
            {isCreatingPlaylist ? 'Creating...' : 'Create'}
          </MuiButton>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Name</Typography>
            <TextField
              placeholder="e.g., Hard Crimps"
              autoFocus
              fullWidth
              size="small"
              value={playlistFormValues.name}
              onChange={(e) => {
                setPlaylistFormValues((prev) => ({ ...prev, name: e.target.value }));
                setPlaylistFormErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={!!playlistFormErrors.name}
              helperText={playlistFormErrors.name}
            />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Description (optional)</Typography>
            <TextField
              placeholder="Optional description..."
              multiline
              rows={2}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { maxLength: 500 } }}
              value={playlistFormValues.description}
              onChange={(e) => {
                setPlaylistFormValues((prev) => ({ ...prev, description: e.target.value }));
                setPlaylistFormErrors((prev) => ({ ...prev, description: '' }));
              }}
              error={!!playlistFormErrors.description}
              helperText={playlistFormErrors.description}
            />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Color (optional)</Typography>
            <TextField
              type="color"
              value={playlistFormValues.color || '#000000'}
              onChange={(e) => setPlaylistFormValues((prev) => ({ ...prev, color: e.target.value }))}
              size="small"
              sx={{ width: 80 }}
            />
          </Box>
        </Box>
      </SwipeableDrawer>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          setIsCreatePlaylistOpen(true);
        }}
        title="Sign in to create playlists"
        description="Sign in to create and manage your climb playlists."
      />
    </>
  );
}

export default BottomTabBar;
