'use client';

import React, { useState } from 'react';
import {
  TeamOutlined,
  CopyOutlined,
  CrownFilled,
  LoadingOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { Button, Input, Drawer, QRCode, Flex, message, Typography, Badge, Segmented } from 'antd';
import { usePathname, useSearchParams } from 'next/navigation';
import { useConnection, useDaemonConnection } from '../connection-manager/use-connection';
import { usePartyContext } from '../party-manager/party-context';
import { usePartyMode, PartyMode } from '../connection-manager/use-party-mode';
import { useDaemonUrl } from '../connection-manager/use-daemon-url';
import { DaemonSetupPanel } from './daemon-setup-panel';

const { Text } = Typography;

const getShareUrl = (
  pathname: string,
  searchParams: URLSearchParams,
  peerId: string,
  daemonUrl: string | null,
  partyMode: PartyMode,
) => {
  try {
    const params = new URLSearchParams(searchParams.toString());
    // Remove existing connection params
    params.delete('hostId');
    params.delete('daemonUrl');

    if (partyMode === 'daemon' && daemonUrl) {
      params.set('daemonUrl', daemonUrl);
    } else {
      params.set('hostId', peerId);
    }
    return `${window.location.origin}${pathname}?${params.toString()}`;
  } catch {
    return '';
  }
};

export const ShareBoardButton = () => {
  const { peerId, isConnecting, hasConnected, connections } = useConnection();
  const daemonConnection = useDaemonConnection();
  const { connectedUsers, userName } = usePartyContext();
  const { partyMode, setPartyMode } = usePartyMode();
  const { daemonUrl, setDaemonUrl, clearDaemonUrl } = useDaemonUrl();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const showDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleClose = () => {
    setIsDrawerOpen(false);
  };

  // Determine effective connection state
  const isDaemonMode = partyMode === 'daemon';
  const isDaemonConnected = daemonConnection?.hasConnected ?? false;
  const isDaemonConnecting = daemonConnection?.isConnecting ?? false;
  const daemonError = daemonConnection?.connectionError ?? null;

  // Get the effective host ID for share URL
  const effectiveHostId = isDaemonMode ? daemonConnection?.peerId : peerId;

  const shareUrl = getShareUrl(
    pathname,
    searchParams,
    effectiveHostId || peerId || '',
    daemonUrl,
    partyMode,
  );

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

  const handleDaemonConnect = (url: string) => {
    // Set the daemon URL - this will trigger the DaemonProvider to render
    // and automatically connect via the useEffect in daemon-context
    setDaemonUrl(url);
    // Ensure we're in daemon mode
    setPartyMode('daemon');
  };

  const handleDaemonDisconnect = () => {
    if (daemonConnection?.disconnect) {
      daemonConnection.disconnect();
    }
    clearDaemonUrl();
    setPartyMode('direct');
  };

  const handleModeChange = (value: string | number) => {
    const mode = value as PartyMode;
    setPartyMode(mode);

    // If switching to direct mode, disconnect from daemon
    if (mode === 'direct' && isDaemonConnected) {
      handleDaemonDisconnect();
    }
  };

  // Calculate connection count for badge
  const connectionCount = isDaemonMode
    ? (daemonConnection?.daemonUsers?.length ?? 0)
    : connections.length > 0
      ? connections.length + 1
      : 0;

  // Determine button state
  const isButtonConnecting = isDaemonMode ? isDaemonConnecting : isConnecting;
  const isButtonConnected = isDaemonMode ? isDaemonConnected : hasConnected;

  // Get users list based on mode
  const daemonUsers = daemonConnection?.daemonUsers ?? [];
  const currentUserId = isDaemonMode ? daemonConnection?.peerId : peerId;

  return (
    <>
      <Badge count={connectionCount} overflowCount={100} showZero={false} color="cyan">
        <Button
          type="default"
          onClick={showDrawer}
          icon={
            !isButtonConnected && isButtonConnecting ? <LoadingOutlined /> : <TeamOutlined />
          }
          disabled={!isDaemonMode && !peerId}
        />
      </Badge>
      <Drawer
        title={isControllerMode ? 'Controller Mode' : 'Party Mode'}
        placement="top"
        onClose={handleClose}
        open={isDrawerOpen}
        height="70vh"
      >
        <Flex gap="middle" vertical>
          {/* Controller Mode Banner */}
          {isControllerMode && (
            <div
              style={{
                padding: '12px',
                background: '#e6f7ff',
                border: '1px solid #1890ff',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <Flex align="center" gap="small">
                <span style={{ fontSize: '18px' }}>🎮</span>
                <div>
                  <Text strong style={{ color: '#1890ff' }}>
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

          {/* Mode Toggle (only show when not in controller mode) */}
          {!isControllerMode && (
            <Flex vertical gap="small">
              <Segmented
                block
                value={partyMode}
                onChange={handleModeChange}
                options={[
                  { label: 'Direct (P2P)', value: 'direct' },
                  { label: 'Daemon', value: 'daemon' },
                ]}
              />
            </Flex>
          )}

          {/* Daemon Mode Content */}
          {isDaemonMode && !isControllerMode && (
            <>
              {/* Not connected - show setup */}
              {!isDaemonConnected && !isDaemonConnecting && (
                <DaemonSetupPanel
                  onConnect={handleDaemonConnect}
                  isConnecting={isDaemonConnecting}
                  error={daemonError}
                  storedUrl={daemonUrl}
                />
              )}

              {/* Connecting */}
              {isDaemonConnecting && (
                <Flex vertical align="center" gap="middle" style={{ padding: '24px' }}>
                  <LoadingOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                  <Text>Connecting to daemon...</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {daemonUrl}
                  </Text>
                </Flex>
              )}

              {/* Connected */}
              {isDaemonConnected && (
                <>
                  <Flex
                    align="center"
                    gap="small"
                    style={{
                      padding: '12px',
                      background: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      borderRadius: '6px',
                    }}
                  >
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                    <div>
                      <Text strong style={{ color: '#52c41a' }}>
                        Connected to Daemon
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {daemonUrl}
                      </Text>
                    </div>
                  </Flex>

                  {/* Users list for daemon mode */}
                  {daemonUsers.length > 0 && (
                    <Flex vertical gap="small">
                      <Text strong>Connected Users ({daemonUsers.length}):</Text>
                      <Flex
                        vertical
                        gap="small"
                        style={{
                          maxHeight: '150px',
                          overflowY: 'auto',
                          padding: '4px',
                        }}
                      >
                        {daemonUsers.map((user) => (
                          <Flex
                            key={user.id}
                            justify="space-between"
                            align="center"
                            style={{
                              background: user.id === currentUserId ? '#e6f7ff' : '#f5f5f5',
                              padding: '8px 12px',
                              borderRadius: '8px',
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
                              <CrownFilled style={{ color: '#FFD700', fontSize: '16px' }} />
                            )}
                          </Flex>
                        ))}
                      </Flex>
                    </Flex>
                  )}

                  {/* Share URL for daemon mode */}
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

                  {/* Disconnect button */}
                  <Button
                    danger
                    icon={<DisconnectOutlined />}
                    onClick={handleDaemonDisconnect}
                    block
                  >
                    Disconnect from Daemon
                  </Button>
                </>
              )}
            </>
          )}

          {/* Direct (PeerJS) Mode Content */}
          {!isDaemonMode && !isControllerMode && (
            <>
              {/* Connected Users */}
              {(connectedUsers.length > 0 || peerId) && (
                <Flex vertical gap="small">
                  <Text strong>Connected Users:</Text>
                  <Flex
                    vertical
                    gap="small"
                    style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      padding: '4px',
                    }}
                  >
                    <Flex
                      key={peerId}
                      justify="space-between"
                      align="center"
                      style={{
                        background: '#e6f7ff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        width: '100%',
                      }}
                    >
                      <Flex gap="small" align="center">
                        <Text style={{ fontSize: '14px' }}>{userName || peerId} (you)</Text>
                      </Flex>
                    </Flex>
                    {connectedUsers.map((conn) => (
                      <Flex
                        key={conn.id}
                        justify="space-between"
                        align="center"
                        style={{
                          background: '#f5f5f5',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          width: '100%',
                        }}
                      >
                        <Flex gap="small" align="center">
                          <Text style={{ fontSize: '14px' }}>{conn.username || conn.id}</Text>
                        </Flex>
                        {conn.isHost && (
                          <CrownFilled style={{ color: '#FFD700', fontSize: '16px' }} />
                        )}
                      </Flex>
                    ))}
                  </Flex>
                </Flex>
              )}

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
            </>
          )}
        </Flex>
      </Drawer>
    </>
  );
};
