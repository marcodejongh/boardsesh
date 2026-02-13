'use client';

import React, { useState, useCallback, useContext } from 'react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import MuiButton from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import Badge from '@mui/material/Badge';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs, generateLayoutSlug, generateSizeSlug, generateSetSlug, searchParamsToUrlParams } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import { useColorMode } from '@/app/hooks/use-color-mode';
import { PlaylistsContext } from '../climb-actions/playlists-batch-context';
import AuthModal from '../auth/auth-modal';
import { usePersistentSession } from '../persistent-session';
import { getLastUsedBoard } from '@/app/lib/last-used-board-db';
import { getRecentSearches } from '@/app/components/search-drawer/recent-searches-storage';
import BoardSelectorDrawer from '../board-selector-drawer/board-selector-drawer';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import { useUnreadNotificationCount } from '@/app/hooks/use-unread-notification-count';

type Tab = 'home' | 'climbs' | 'library' | 'create' | 'notifications';

interface BottomTabBarProps {
  boardDetails?: BoardDetails | null;
  angle?: number;
  boardConfigs?: BoardConfigData;
}

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

const getActiveTab = (pathname: string): Tab => {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/my-library') || pathname.includes('/playlist/')) return 'library';
  return 'climbs';
};

const INITIAL_PLAYLIST_FORM = { name: '', description: '', color: '' };

const actionSx = {
  color: 'var(--neutral-400)',
  '&.Mui-selected': { color: themeTokens.colors.primary },
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  minWidth: 'auto',
};

function BottomTabBar({ boardDetails, angle, boardConfigs }: BottomTabBarProps) {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isBoardSelectorOpen, setIsBoardSelectorOpen] = useState(false);
  const [playlistFormValues, setPlaylistFormValues] = useState(INITIAL_PLAYLIST_FORM);
  const [playlistFormErrors, setPlaylistFormErrors] = useState<Record<string, string>>({});
  const pathname = usePathname();
  const router = useRouter();

  const notificationUnreadCount = useUnreadNotificationCount();

  // PlaylistsContext is only available on board routes (within PlaylistsProvider)
  const playlistsContext = useContext(PlaylistsContext);
  const createPlaylist = playlistsContext?.createPlaylist;
  const isAuthenticated = playlistsContext?.isAuthenticated ?? false;
  const { showMessage } = useSnackbar();

  // Use the active queue's board details as a fallback when no boardDetails prop
  const {
    activeSession,
    localBoardDetails,
    localCurrentClimbQueueItem,
  } = usePersistentSession();

  // Resolve effective board details: prop > active session > local queue
  const effectiveBoardDetails = boardDetails
    ?? (activeSession ? activeSession.boardDetails : null)
    ?? localBoardDetails;
  const effectiveAngle = angle
    ?? (activeSession ? activeSession.parsedParams.angle : undefined)
    ?? localCurrentClimbQueueItem?.climb?.angle
    ?? 0;

  // Hide playlists for moonboard (not yet supported)
  const isMoonboard = effectiveBoardDetails?.board_name === 'moonboard';

  // Determine active tab from pathname
  const activeTabFromPath = getActiveTab(pathname);
  const activeTab = (isCreateOpen || isCreatePlaylistOpen) ? 'create' : activeTabFromPath;

  // Build URLs using effective board details
  // If we're on a /b/ slug route, preserve the slug URL format
  const listUrl = (() => {
    if (pathname.startsWith('/b/')) {
      const segments = pathname.split('/');
      // /b/{slug}/{angle}/... → /b/{slug}/{angle}/list
      if (segments.length >= 4) {
        return `/b/${segments[2]}/${segments[3]}/list`;
      }
    }
    if (!effectiveBoardDetails) return null;
    const { board_name, layout_name, size_name, size_description, set_names } = effectiveBoardDetails;
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, effectiveAngle);
    }
    return null;
  })();

  const createClimbUrl = (() => {
    if (!effectiveBoardDetails) return null;
    const { board_name, layout_name, size_name, size_description, set_names } = effectiveBoardDetails;
    if (layout_name && size_name && set_names) {
      return `/${board_name}/${generateLayoutSlug(layout_name)}/${generateSizeSlug(size_name, size_description)}/${generateSetSlug(set_names)}/${effectiveAngle}/create`;
    }
    return null;
  })();

  const getPlaylistUrl = useCallback((playlistUuid: string) => {
    return `/my-library/playlist/${playlistUuid}`;
  }, []);

  const handleHomeTab = () => {
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(false);
    router.push('/');
    track('Bottom Tab Bar', { tab: 'home' });
  };

  const handleClimbsTab = async () => {
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(false);

    // 1. Try effectiveBoardDetails (from current route or active session)
    let url = listUrl;

    // 2. Try getLastUsedBoard() from IndexedDB
    if (!url) {
      const lastUsed = await getLastUsedBoard();
      if (lastUsed?.url) {
        url = lastUsed.url;
      }
    }

    // 3. Open board selector drawer if no board context
    if (!url) {
      if (boardConfigs) {
        setIsBoardSelectorOpen(true);
      }
      track('Bottom Tab Bar', { tab: 'climbs', action: 'open_selector' });
      return;
    }

    // Auto-apply most recent filter
    try {
      const recentSearches = await getRecentSearches();
      if (recentSearches.length > 0) {
        const mostRecent = recentSearches[0];
        const filterParams = searchParamsToUrlParams(mostRecent.filters as Parameters<typeof searchParamsToUrlParams>[0]);
        const filterString = filterParams.toString();
        if (filterString) {
          url = `${url}?${filterString}`;
        }
      }
    } catch {
      // Ignore errors loading recent searches
    }

    const currentUrl = pathname + (typeof window !== 'undefined' ? window.location.search : '');
    if (url !== currentUrl) {
      router.push(url);
    }
    track('Bottom Tab Bar', { tab: 'climbs' });
  };

  const handleLibraryTab = () => {
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(false);
    const url = '/my-library';
    const currentUrl = pathname + (typeof window !== 'undefined' ? window.location.search : '');
    if (url !== currentUrl) {
      router.push(url);
    }
    track('Bottom Tab Bar', { tab: 'library' });
  };

  const handleNotificationsTab = () => {
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(false);
    router.push('/notifications');
    track('Bottom Tab Bar', { tab: 'notifications' });
  };

  const handleCreateTab = () => {
    if (!playlistsContext) {
      if (createClimbUrl) {
        router.push(createClimbUrl);
      } else if (boardConfigs) {
        setIsBoardSelectorOpen(true);
      }
    } else {
      setIsCreateOpen(true);
    }
    track('Bottom Tab Bar', { tab: 'create' });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: Tab) => {
    switch (newValue) {
      case 'home':
        handleHomeTab();
        break;
      case 'climbs':
        handleClimbsTab();
        break;
      case 'library':
        handleLibraryTab();
        break;
      case 'create':
        handleCreateTab();
        break;
      case 'notifications':
        handleNotificationsTab();
        break;
    }
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
    if (!validatePlaylistForm() || !createPlaylist) {
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
        boardName: effectiveBoardDetails?.board_name ?? 'unknown',
        playlistName: playlistFormValues.name,
        source: 'bottom-tab-bar',
      });

      setPlaylistFormValues(INITIAL_PLAYLIST_FORM);
      setPlaylistFormErrors({});
      setIsCreatePlaylistOpen(false);

      // Navigate to the new playlist
      router.push(getPlaylistUrl(newPlaylist.uuid));
    } catch (error) {
      showMessage('Failed to create playlist', 'error');
    } finally {
      setIsCreatingPlaylist(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistFormValues, createPlaylist, effectiveBoardDetails?.board_name, router, getPlaylistUrl, showMessage]);

  return (
    <>
      <BottomNavigation
        value={activeTab}
        onChange={handleTabChange}
        showLabels
        sx={{
          background: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)',
          WebkitBackdropFilter: isDark ? 'blur(20px)' : 'blur(5px)',
          backdropFilter: isDark ? 'blur(20px)' : 'blur(5px)',
          borderRadius: `${themeTokens.borderRadius.xl}px`,
          py: `${themeTokens.spacing[2]}px`,
          height: 'auto',
          '@media (min-width: 768px)': {
            maxWidth: 480,
            mx: 'auto',
            boxShadow: themeTokens.shadows.lg,
            border: `1px solid var(--neutral-200)`,
          },
        }}
      >
        <BottomNavigationAction
          label="Home"
          icon={<HomeOutlined sx={{ fontSize: 20 }} />}
          value="home"
          sx={actionSx}
        />
        <BottomNavigationAction
          label="Climb"
          icon={<FormatListBulletedOutlined sx={{ fontSize: 20 }} />}
          value="climbs"
          sx={actionSx}
        />
        <BottomNavigationAction
          label="Your Library"
          icon={<LocalOfferOutlined sx={{ fontSize: 20 }} />}
          value="library"
          sx={actionSx}
        />
        <BottomNavigationAction
          label="Create"
          icon={<AddOutlined sx={{ fontSize: 20 }} />}
          value="create"
          sx={actionSx}
        />
        <BottomNavigationAction
          label="Notifications"
          icon={
            <Badge
              badgeContent={notificationUnreadCount}
              color="error"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}
            >
              <NotificationsOutlined sx={{ fontSize: 20 }} />
            </Badge>
          }
          value="notifications"
          sx={actionSx}
        />
      </BottomNavigation>

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

      {/* Board Selector Drawer */}
      {boardConfigs && (
        <BoardSelectorDrawer
          open={isBoardSelectorOpen}
          onClose={() => setIsBoardSelectorOpen(false)}
          boardConfigs={boardConfigs}
        />
      )}

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
