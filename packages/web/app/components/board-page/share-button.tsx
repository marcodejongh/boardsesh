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
} from '@ant-design/icons';
import { Button, Input, QRCode, Flex, App, Typography, Badge, Switch, Tabs, Space } from 'antd';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueueContext } from '../graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';
import AuthModal from '../auth/auth-modal';

const { Text } = Typography;

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

export const ShareBoardButton = ({ buttonType = 'default' as 'default' | 'text' }) => {
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
      setSessionName(''); // Clear the input after starting
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
      // Extract session ID from URL if full URL was pasted
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

  // Calculate connection count for badge
  const connectionCount = users?.length ?? 0;

  // Get users list
  const currentUserId = clientId;

  return (
    <>
      <Badge count={connectionCount} overflowCount={100} showZero={false} color="cyan">
        <Button
          type={isSessionActive ? 'primary' : buttonType}
          onClick={showDrawer}
          icon={isConnecting ? <LoadingOutlined /> : <TeamOutlined />}
        />
      </Badge>
      <SwipeableDrawer
        title={isControllerMode ? 'Controller Mode' : 'Party Mode'}
        placement="top"
        onClose={handleClose}
        open={isDrawerOpen}
        size="large"
        styles={{
          wrapper: { height: '70vh' },
        }}
      >
        <Flex gap="middle" vertical>
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
              <Flex align="center" gap="small">
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
              </Flex>
            </div>
          )}

          {/* Party Mode Content */}
          {!isControllerMode && (
            <>
              {/* No active session - show start/join options */}
              {!isSessionActive && !isConnecting && (
                <Tabs
                  defaultActiveKey="start"
                  items={[
                    {
                      key: 'start',
                      label: 'Start Session',
                      children: (
                        <Flex vertical gap="middle">
                          <Text>
                            Start a party mode session to climb with others. Share your queue and take turns!
                          </Text>

                          {!isLoggedIn && (
                            <Flex
                              align="center"
                              gap="small"
                              style={{
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
                            </Flex>
                          )}

                          {isLoggedIn && (
                            <>
                              <Flex vertical gap="small">
                                <Text strong>Session Name (optional)</Text>
                                <Input
                                  placeholder="e.g., Tuesday Night Climbs"
                                  value={sessionName}
                                  onChange={(e) => setSessionName(e.target.value)}
                                  maxLength={50}
                                />
                              </Flex>

                              <Flex align="center" justify="space-between">
                                <Space orientation="vertical" size={0}>
                                  <Text strong>Allow others to discover this session</Text>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Others nearby can find and join your session
                                  </Text>
                                </Space>
                                <Switch checked={discoverable} onChange={setDiscoverable} />
                              </Flex>

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
                        </Flex>
                      ),
                    },
                    {
                      key: 'join',
                      label: 'Join Session',
                      children: (
                        <Flex vertical gap="middle">
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
                        </Flex>
                      ),
                    },
                  ]}
                />
              )}

              {/* Connecting */}
              {isConnecting && (
                <Flex vertical align="center" gap="middle" style={{ padding: '24px' }}>
                  <LoadingOutlined style={{ fontSize: '32px', color: themeTokens.colors.primary }} />
                  <Text>Connecting to session...</Text>
                </Flex>
              )}

              {/* Connection error */}
              {connectionError && !isConnecting && (
                <Flex
                  align="center"
                  gap="small"
                  style={{
                    padding: '12px',
                    background: themeTokens.colors.errorBg,
                    border: `1px solid ${themeTokens.colors.error}`,
                    borderRadius: themeTokens.borderRadius.md,
                  }}
                >
                  <Text type="danger">{connectionError.message}</Text>
                </Flex>
              )}

              {/* Connected - show session info */}
              {isConnected && (
                <>
                  <Flex
                    align="center"
                    gap="small"
                    style={{
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
                  </Flex>

                  {/* Users list */}
                  {users && users.length > 0 && (
                    <Flex vertical gap="small">
                      <Text strong>Connected Users ({users.length}):</Text>
                      <Flex
                        vertical
                        gap="small"
                        style={{
                          maxHeight: '150px',
                          overflowY: 'auto',
                          padding: '4px',
                        }}
                      >
                        {users.map((user) => (
                          <Flex
                            key={user.id}
                            justify="space-between"
                            align="center"
                            style={{
                              background:
                                user.id === currentUserId ? themeTokens.semantic.selected : themeTokens.neutral[100],
                              padding: '8px 12px',
                              borderRadius: themeTokens.borderRadius.md,
                              width: '100%',
                            }}
                          >
                            <Flex gap="small" align="center">
                              <Text style={{ fontSize: '14px' }}>
                                {user.username}
                                {user.id === currentUserId && ' (you)'}
                              </Text>
                            </Flex>
                            {user.isLeader && (
                              <CrownFilled style={{ color: themeTokens.colors.warning, fontSize: '16px' }} />
                            )}
                          </Flex>
                        ))}
                      </Flex>
                    </Flex>
                  )}

                  {/* Sign-in prompt for non-authenticated users */}
                  {!isLoggedIn && (
                    <Flex
                      align="center"
                      justify="space-between"
                      style={{
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
                    </Flex>
                  )}

                  {/* Share section */}
                  <Flex vertical gap="small">
                    <Text strong>Invite others to join:</Text>

                    {/* Share URL */}
                    <Flex style={{ width: '100%' }} align="center">
                      <Input
                        value={shareUrl}
                        readOnly
                        addonAfter={<Button icon={<CopyOutlined />} onClick={copyToClipboard} />}
                      />
                    </Flex>

                    <Flex justify="center">
                      <QRCode value={shareUrl} size={160} bordered={false} />
                    </Flex>
                  </Flex>
                </>
              )}
            </>
          )}
        </Flex>
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
