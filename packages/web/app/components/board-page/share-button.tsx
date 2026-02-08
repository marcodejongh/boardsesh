'use client';

import React, { useState } from 'react';
import {
  TeamOutlined,
  CopyOutlined,
  CrownFilled,
  LoadingOutlined,
  CheckCircleOutlined,
  LoginOutlined,
  PlayCircleOutlined,
  CloseCircleOutlined,
  BulbOutlined,
  BulbFilled,
  AppleOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { Button, Input, QRCode, App, Typography, Badge, Switch, Tabs } from 'antd';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueueContext } from '../graphql-queue';
import { useBluetoothContext } from '../board-bluetooth-control/bluetooth-context';
import { themeTokens } from '@/app/theme/theme-config';
import AuthModal from '../auth/auth-modal';

const { Text, Paragraph } = Typography;

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
      <Text>
        Connect to your board via Bluetooth to illuminate routes with LEDs.
        Routes will automatically update as you navigate between climbs.
      </Text>

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
          <Paragraph style={{ margin: 0 }}>
            <Text>
              Your browser does not support Web Bluetooth, which means you
              won&#39;t be able to illuminate routes on the board.
            </Text>
          </Paragraph>
          {isIOS ? (
            <>
              <Paragraph style={{ margin: 0 }}>
                To control your board from an iOS device, install the Bluefy
                browser:
              </Paragraph>
              <Button
                type="primary"
                icon={<AppleOutlined />}
                href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055"
                target="_blank"
              >
                Download Bluefy from the App Store
              </Button>
            </>
          ) : (
            <Paragraph style={{ margin: 0 }}>
              For the best experience, please use Chrome or another
              Chromium-based browser.
            </Paragraph>
          )}
        </Box>
      )}

      {isBluetoothSupported && !isConnected && (
        <Button
          type="primary"
          size="large"
          icon={<BulbOutlined />}
          onClick={handleConnect}
          loading={loading}
          block
        >
          Connect to Board
        </Button>
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
            <BulbFilled
              style={{ color: themeTokens.colors.success, fontSize: '18px' }}
            />
            <div style={{ flex: 1 }}>
              <Text strong style={{ color: themeTokens.colors.success }}>
                Board Connected
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Routes illuminate automatically when navigating
              </Text>
            </div>
            <Button
              type="text"
              danger
              icon={<ApiOutlined />}
              onClick={disconnect}
            >
              Disconnect
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export const ShareBoardButton = ({ buttonType = 'default' }: { buttonType?: 'default' | 'text' }) => {
  const { message } = App.useApp();
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
        message.success('Share URL copied to clipboard!');
      })
      .catch(() => {
        message.error('Failed to copy URL.');
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
      message.success('Party mode started!');
      setSessionName('');
    } catch (error) {
      console.error('Failed to start session:', error);
      message.error('Failed to start party mode');
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleJoinSession = async () => {
    if (!joinSessionId.trim()) {
      message.warning('Please enter a session ID');
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
      message.success('Joined party mode!');
      setJoinSessionId('');
    } catch (error) {
      console.error('Failed to join session:', error);
      message.error('Failed to join session');
    }
  };

  const handleEndSession = () => {
    endSession();
    message.info('Left party mode');
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
        <CheckCircleOutlined style={{ color: themeTokens.colors.success, fontSize: '18px' }} />
        <div style={{ flex: 1 }}>
          <Text strong style={{ color: themeTokens.colors.success }}>
            Party Mode Active
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Session: {sessionId?.substring(0, 8)}...
          </Text>
        </div>
        <Button
          type="text"
          danger
          icon={<CloseCircleOutlined />}
          onClick={handleEndSession}
        >
          Leave
        </Button>
      </Box>

      {users && users.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Text strong>Connected Users ({users.length}):</Text>
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
                  <Text style={{ fontSize: '14px' }}>
                    {user.username}
                    {user.id === currentUserId && ' (you)'}
                  </Text>
                </Box>
                {user.isLeader && (
                  <CrownFilled style={{ color: themeTokens.colors.warning, fontSize: '16px' }} />
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
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Sign in to customize your username
          </Text>
          <Button type="link" size="small" icon={<LoginOutlined />} onClick={() => setShowAuthModal(true)}>
            Sign in
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Text strong>Invite others to join:</Text>
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
          <Input
            value={shareUrl}
            readOnly
            addonAfter={<Button icon={<CopyOutlined />} onClick={copyToClipboard} />}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <QRCode value={shareUrl} size={160} bordered={false} />
        </Box>
      </Box>
    </>
  );

  // Tab items for when no session is active
  const noSessionTabs = [
    {
      key: 'start',
      label: 'Start Session',
      children: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text>
            Start a party mode session to climb with others. Share your queue and take turns!
          </Text>

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
              <Text>Sign in to start a party session</Text>
              <Button type="primary" size="small" icon={<LoginOutlined />} onClick={() => setShowAuthModal(true)}>
                Sign in
              </Button>
            </Box>
          )}

          {isLoggedIn && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Text strong>Session Name (optional)</Text>
                <Input
                  placeholder="e.g., Tuesday Night Climbs"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  maxLength={50}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack spacing={0}>
                  <Text strong>Allow others to discover this session</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Others nearby can find and join your session
                  </Text>
                </Stack>
                <Switch checked={discoverable} onChange={setDiscoverable} />
              </Box>

              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStartSession}
                loading={isStartingSession}
                block
              >
                Start Party Mode
              </Button>
            </>
          )}
        </Box>
      ),
    },
    {
      key: 'join',
      label: 'Join Session',
      children: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text>Enter a session link or ID to join an existing party.</Text>

          <Input
            placeholder="Paste session link or ID..."
            value={joinSessionId}
            onChange={(e) => setJoinSessionId(e.target.value)}
            onPressEnter={handleJoinSession}
          />

          <Button type="primary" size="large" onClick={handleJoinSession} block>
            Join Session
          </Button>
        </Box>
      ),
    },
    {
      key: 'led',
      label: 'Connect to Board',
      children: <LedConnectionTab />,
    },
  ];

  // Tab items for when session is active
  const activeSessionTabs = [
    {
      key: 'session',
      label: 'Session',
      children: (
        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
          {sessionInfoContent}
        </Box>
      ),
    },
    {
      key: 'led',
      label: 'Connect to Board',
      children: <LedConnectionTab />,
    },
  ];

  return (
    <>
      <Badge count={connectionCount} overflowCount={100} showZero={false} color={themeTokens.colors.primary}>
        <Button
          type={isSessionActive ? 'primary' : buttonType}
          onClick={showDrawer}
          icon={isConnecting ? <LoadingOutlined /> : <TeamOutlined />}
        />
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
            <div
              style={{
                padding: '12px',
                background: themeTokens.semantic.selected,
                border: `1px solid ${themeTokens.colors.primary}`,
                borderRadius: themeTokens.borderRadius.md,
                marginBottom: '16px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: '18px' }}>🎮</span>
                <div>
                  <Text strong style={{ color: themeTokens.colors.primary }}>
                    Board Controller Connected
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Queue management is handled by your Board Controller
                  </Text>
                </div>
              </Box>
            </div>
          )}

          {/* Party Mode Content */}
          {!isControllerMode && (
            <>
              {/* No active session and not connecting - show start/join/LED tabs */}
              {!isSessionActive && !isConnecting && (
                <Tabs defaultActiveKey="start" items={noSessionTabs} />
              )}

              {/* Connecting */}
              {isConnecting && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '24px' }}>
                  <LoadingOutlined style={{ fontSize: '32px', color: themeTokens.colors.primary }} />
                  <Text>Connecting to session...</Text>
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
                  <Text type="danger">{connectionError.message}</Text>
                </Box>
              )}

              {/* Connected - show session info + LED tabs */}
              {isConnected && (
                <Tabs defaultActiveKey="session" items={activeSessionTabs} />
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
