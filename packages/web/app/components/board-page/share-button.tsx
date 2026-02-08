'use client';

import React, { useState } from 'react';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import PlayCircleOutlineOutlined from '@mui/icons-material/PlayCircleOutlineOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import Lightbulb from '@mui/icons-material/Lightbulb';
import AppleOutlined from '@mui/icons-material/Apple';
import ApiOutlined from '@mui/icons-material/ApiOutlined';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { QRCodeSVG } from 'qrcode.react';
import MuiSwitch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueueContext } from '../graphql-queue';
import { useBluetoothContext } from '../board-bluetooth-control/bluetooth-context';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { TabPanel } from '@/app/components/ui/tab-panel';
import { themeTokens } from '@/app/theme/theme-config';
import AuthModal from '../auth/auth-modal';

const getShareUrl = (pathname: string, sessionId: string | null) => {
  try {
    if (!sessionId) return '';
    const params = new URLSearchParams();
    params.set('session', sessionId);
    return `${window.location.origin}${pathname}?${params.toString()}`;
  } catch {
    return '';
  }
};

function LedConnectionTab() {
  const {
    isConnected,
    loading,
    connect,
    disconnect,
    isBluetoothSupported,
    isIOS,
  } = useBluetoothContext();
  const { currentClimbQueueItem } = useQueueContext();

  const handleConnect = async () => {
    if (currentClimbQueueItem) {
      await connect(
        currentClimbQueueItem.climb.frames,
        !!currentClimbQueueItem.climb.mirrored,
      );
    } else {
      await connect();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" component="span">
        Connect to your board via Bluetooth to illuminate routes with LEDs.
        Routes will automatically update as you navigate between climbs.
      </Typography>

      {!isBluetoothSupported && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            padding: '12px',
            background: themeTokens.colors.warningBg,
            border: `1px solid ${themeTokens.colors.warning}`,
            borderRadius: themeTokens.borderRadius.md,
          }}
        >
          <Typography variant="body1" component="p" sx={{ margin: 0 }}>
            <Typography variant="body2" component="span">
              Your browser does not support Web Bluetooth, which means you
              won&#39;t be able to illuminate routes on the board.
            </Typography>
          </Typography>
          {isIOS ? (
            <>
              <Typography variant="body1" component="p" sx={{ margin: 0 }}>
                To control your board from an iOS device, install the Bluefy
                browser:
              </Typography>
              <MuiButton
                variant="contained"
                startIcon={<AppleOutlined />}
                href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055"
                target="_blank"
              >
                Download Bluefy from the App Store
              </MuiButton>
            </>
          ) : (
            <Typography variant="body1" component="p" sx={{ margin: 0 }}>
              For the best experience, please use Chrome or another
              Chromium-based browser.
            </Typography>
          )}
        </Box>
      )}

      {isBluetoothSupported && !isConnected && (
        <MuiButton
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={16} /> : <LightbulbOutlined />}
          onClick={handleConnect}
          disabled={loading}
          fullWidth
        >
          Connect to Board
        </MuiButton>
      )}

      {isConnected && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              padding: '12px',
              background: themeTokens.colors.successBg,
              border: `1px solid ${themeTokens.colors.success}`,
              borderRadius: themeTokens.borderRadius.md,
            }}
          >
            <Lightbulb
              sx={{ color: themeTokens.colors.success, fontSize: '18px' }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" component="span" fontWeight={600} sx={{ color: themeTokens.colors.success }}>
                Board Connected
              </Typography>
              <br />
              <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: '12px' }}>
                Routes illuminate automatically when navigating
              </Typography>
            </Box>
            <MuiButton
              variant="text"
              color="error"
              startIcon={<ApiOutlined />}
              onClick={disconnect}
            >
              Disconnect
            </MuiButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export const ShareBoardButton = ({ buttonType = 'default' }: { buttonType?: 'default' | 'text' }) => {
  const { showMessage } = useSnackbar();
  const {
    users,
    clientId,
    hasConnected,
    connectionError,
    isSessionActive,
    sessionId,
    startSession,
    joinSession,
    endSession,
  } = useQueueContext();
  const { status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState('');
  const [discoverable, setDiscoverable] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [activeNoSessionTab, setActiveNoSessionTab] = useState('start');
  const [activeSessionTab, setActiveSessionTab] = useState('session');

  const isLoggedIn = authStatus === 'authenticated';

  const showDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleClose = () => {
    setIsDrawerOpen(false);
  };

  // Determine connection state
  const isConnecting = !!(sessionId && !hasConnected);
  const isConnected = !!(sessionId && hasConnected);

  const shareUrl = getShareUrl(pathname, sessionId);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        showMessage('Share URL copied to clipboard!', 'success');
      })
      .catch(() => {
        showMessage('Failed to copy URL.', 'error');
      });
  };

  const handleStartSession = async () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    setIsStartingSession(true);
    try {
      await startSession({ discoverable, name: sessionName.trim() || undefined });
      showMessage('Party mode started!', 'success');
      setSessionName('');
    } catch (error) {
      console.error('Failed to start session:', error);
      showMessage('Failed to start party mode', 'error');
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleJoinSession = async () => {
    if (!joinSessionId.trim()) {
      showMessage('Please enter a session ID', 'warning');
      return;
    }

    try {
      let sessionIdToJoin = joinSessionId.trim();
      try {
        const url = new URL(sessionIdToJoin);
        const sessionParam = url.searchParams.get('session');
        if (sessionParam) {
          sessionIdToJoin = sessionParam;
        }
      } catch {
        // Not a URL, use as-is
      }

      await joinSession(sessionIdToJoin);
      showMessage('Joined party mode!', 'success');
      setJoinSessionId('');
    } catch (error) {
      console.error('Failed to join session:', error);
      showMessage('Failed to join session', 'error');
    }
  };

  const handleEndSession = () => {
    endSession();
    showMessage('Left party mode', 'info');
  };

  const connectionCount = users?.length ?? 0;
  const currentUserId = clientId;

  // Session info content (shared between active and inactive states)
  const sessionInfoContent = (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '12px',
          background: themeTokens.colors.successBg,
          border: `1px solid ${themeTokens.colors.success}`,
          borderRadius: themeTokens.borderRadius.md,
        }}
      >
        <CheckCircleOutlined sx={{ color: themeTokens.colors.success, fontSize: '18px' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" component="span" fontWeight={600} sx={{ color: themeTokens.colors.success }}>
            Party Mode Active
          </Typography>
          <br />
          <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: '12px' }}>
            Session: {sessionId?.substring(0, 8)}...
          </Typography>
        </Box>
        <MuiButton
          variant="text"
          color="error"
          startIcon={<CancelOutlined />}
          onClick={handleEndSession}
        >
          Leave
        </MuiButton>
      </Box>

      {users && users.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" component="span" fontWeight={600}>Connected Users ({users.length}):</Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              maxHeight: '150px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {users.map((user) => (
              <Box
                key={user.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background:
                    user.id === currentUserId ? themeTokens.semantic.selected : themeTokens.neutral[100],
                  padding: '8px 12px',
                  borderRadius: themeTokens.borderRadius.md,
                  width: '100%',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" component="span" sx={{ fontSize: '14px' }}>
                    {user.username}
                    {user.id === currentUserId && ' (you)'}
                  </Typography>
                </Box>
                {user.isLeader && (
                  <EmojiEvents sx={{ color: themeTokens.colors.warning, fontSize: '16px' }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {!isLoggedIn && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            background: themeTokens.neutral[100],
            borderRadius: themeTokens.borderRadius.md,
          }}
        >
          <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: '13px' }}>
            Sign in to customize your username
          </Typography>
          <MuiButton variant="text" size="small" startIcon={<LoginOutlined />} onClick={() => setShowAuthModal(true)}>
            Sign in
          </MuiButton>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" component="span" fontWeight={600}>Invite others to join:</Typography>
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
          <TextField
            value={shareUrl}
            slotProps={{ input: { readOnly: true } }}
            variant="outlined"
            size="small"
            fullWidth
          />
          <IconButton onClick={copyToClipboard}>
            <ContentCopyOutlined />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <QRCodeSVG value={shareUrl} size={160} />
        </Box>
      </Box>
    </>
  );

  // Tab content for when no session is active
  const startTabContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" component="span">
        Start a party mode session to climb with others. Share your queue and take turns!
      </Typography>

      {!isLoggedIn && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            padding: '12px',
            background: themeTokens.colors.warningBg,
            border: `1px solid ${themeTokens.colors.warning}`,
            borderRadius: themeTokens.borderRadius.md,
          }}
        >
          <Typography variant="body2" component="span">Sign in to start a party session</Typography>
          <MuiButton variant="contained" size="small" startIcon={<LoginOutlined />} onClick={() => setShowAuthModal(true)}>
            Sign in
          </MuiButton>
        </Box>
      )}

      {isLoggedIn && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" component="span" fontWeight={600}>Session Name (optional)</Typography>
            <TextField
              placeholder="e.g., Tuesday Night Climbs"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 50 } }}
              variant="outlined"
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack spacing={0}>
              <Typography variant="body2" component="span" fontWeight={600}>Allow others to discover this session</Typography>
              <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: '12px' }}>
                Others nearby can find and join your session
              </Typography>
            </Stack>
            <MuiSwitch checked={discoverable} onChange={(_, checked) => setDiscoverable(checked)} />
          </Box>

          <MuiButton
            variant="contained"
            size="large"
            startIcon={isStartingSession ? <CircularProgress size={16} /> : <PlayCircleOutlineOutlined />}
            onClick={handleStartSession}
            disabled={isStartingSession}
            fullWidth
          >
            Start Party Mode
          </MuiButton>
        </>
      )}
    </Box>
  );

  const joinTabContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" component="span">Enter a session link or ID to join an existing party.</Typography>

      <TextField
        placeholder="Paste session link or ID..."
        value={joinSessionId}
        onChange={(e) => setJoinSessionId(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
        variant="outlined"
        size="small"
      />

      <MuiButton variant="contained" size="large" onClick={handleJoinSession} fullWidth>
        Join Session
      </MuiButton>
    </Box>
  );

  const ledTabContent = <LedConnectionTab />;

  return (
    <>
      <Badge badgeContent={connectionCount} max={100} color="primary" invisible={connectionCount === 0}>
        <IconButton
          onClick={showDrawer}
          color={isSessionActive ? 'primary' : 'default'}
        >
          {isConnecting ? <CircularProgress size={16} /> : <GroupOutlined />}
        </IconButton>
      </Badge>
      <SwipeableDrawer
        title={isControllerMode ? 'Controller Mode' : 'Party Mode'}
        placement="bottom"
        onClose={handleClose}
        open={isDrawerOpen}
        styles={{
          wrapper: { height: '70vh' },
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
          {/* Controller Mode Banner */}
          {isControllerMode && (
            <Box
              sx={{
                padding: '12px',
                background: themeTokens.semantic.selected,
                border: `1px solid ${themeTokens.colors.primary}`,
                borderRadius: themeTokens.borderRadius.md,
                mb: '16px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ fontSize: '18px' }}>🎮</Box>
                <Box>
                  <Typography variant="body2" component="span" fontWeight={600} sx={{ color: themeTokens.colors.primary }}>
                    Board Controller Connected
                  </Typography>
                  <br />
                  <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: '12px' }}>
                    Queue management is handled by your Board Controller
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Party Mode Content */}
          {!isControllerMode && (
            <>
              {/* No active session and not connecting - show start/join/LED tabs */}
              {!isSessionActive && !isConnecting && (
                <>
                  <Tabs value={activeNoSessionTab} onChange={(_, v) => setActiveNoSessionTab(v)}>
                    <Tab label="Start Session" value="start" />
                    <Tab label="Join Session" value="join" />
                    <Tab label="Connect to Board" value="led" />
                  </Tabs>
                  <TabPanel value={activeNoSessionTab} index="start">
                    {startTabContent}
                  </TabPanel>
                  <TabPanel value={activeNoSessionTab} index="join">
                    {joinTabContent}
                  </TabPanel>
                  <TabPanel value={activeNoSessionTab} index="led">
                    {ledTabContent}
                  </TabPanel>
                </>
              )}

              {/* Connecting */}
              {isConnecting && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '24px' }}>
                  <CircularProgress size={32} sx={{ color: themeTokens.colors.primary }} />
                  <Typography variant="body2" component="span">Connecting to session...</Typography>
                </Box>
              )}

              {/* Connection error */}
              {connectionError && !isConnecting && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    padding: '12px',
                    background: themeTokens.colors.errorBg,
                    border: `1px solid ${themeTokens.colors.error}`,
                    borderRadius: themeTokens.borderRadius.md,
                  }}
                >
                  <Typography variant="body2" component="span" color="error">{connectionError.message}</Typography>
                </Box>
              )}

              {/* Connected - show session info + LED tabs */}
              {isConnected && (
                <>
                  <Tabs value={activeSessionTab} onChange={(_, v) => setActiveSessionTab(v)}>
                    <Tab label="Session" value="session" />
                    <Tab label="Connect to Board" value="led" />
                  </Tabs>
                  <TabPanel value={activeSessionTab} index="session">
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                      {sessionInfoContent}
                    </Box>
                  </TabPanel>
                  <TabPanel value={activeSessionTab} index="led">
                    {ledTabContent}
                  </TabPanel>
                </>
              )}
            </>
          )}
        </Box>
      </SwipeableDrawer>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to start party mode"
        description="Create an account or sign in to start a party session and climb with others."
      />
    </>
  );
};
