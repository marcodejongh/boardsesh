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
import { Button, Input, Drawer, QRCode, Flex, message, Typography, Badge } from 'antd';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePartyContext } from '../party-manager/party-context';
import { useBackendUrl } from '../connection-manager/connection-settings-context';
import { useQueueContext } from '../graphql-queue';
import { BackendSetupPanel } from './backend-setup-panel';

const { Text } = Typography;

const getShareUrl = (pathname: string, searchParams: URLSearchParams, backendUrl: string | null) => {
  try {
    const params = new URLSearchParams(searchParams.toString());
    // Remove existing connection params
    params.delete('hostId');
    params.delete('backendUrl');

    if (backendUrl) {
      params.set('backendUrl', backendUrl);
    }
    return `${window.location.origin}${pathname}?${params.toString()}`;
  } catch {
    return '';
  }
};

export const ShareBoardButton = () => {
  const { users, clientId, isBackendMode, hasConnected, connectionError, disconnect } = useQueueContext();
  const { connectedUsers, userName } = usePartyContext();
  const { backendUrl, setBackendUrl, clearBackendUrl } = useBackendUrl();
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

  // Determine connection state
  const isConnecting = !!(isBackendMode && !hasConnected);
  const isConnected = !!(isBackendMode && hasConnected);

  const shareUrl = getShareUrl(pathname, searchParams, backendUrl);

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

  const handleBackendConnect = (url: string) => {
    setBackendUrl(url);
  };

  const handleBackendDisconnect = () => {
    // First disconnect the GraphQL client, then clear the URL
    disconnect?.();
    clearBackendUrl();
  };

  // Calculate connection count for badge
  const connectionCount = users?.length ?? 0;

  // Get users list
  const currentUserId = clientId;

  return (
    <>
      <Badge count={connectionCount} overflowCount={100} showZero={false} color="cyan">
        <Button
          type="default"
          onClick={showDrawer}
          icon={!isConnected && isConnecting ? <LoadingOutlined /> : <TeamOutlined />}
          disabled={!isBackendMode && !clientId}
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

          {/* Backend Mode Content */}
          {!isControllerMode && (
            <>
              {/* Not connected - show setup */}
              {!isConnected && !isConnecting && (
                <BackendSetupPanel
                  onConnect={handleBackendConnect}
                  isConnecting={isConnecting}
                  error={connectionError?.message ?? null}
                  storedUrl={backendUrl}
                />
              )}

              {/* Connecting */}
              {isConnecting && (
                <Flex vertical align="center" gap="middle" style={{ padding: '24px' }}>
                  <LoadingOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                  <Text>Connecting to backend...</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {backendUrl}
                  </Text>
                </Flex>
              )}

              {/* Connected */}
              {isConnected && (
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
                        Connected to Backend
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {backendUrl}
                      </Text>
                    </div>
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

                  {/* Disconnect button */}
                  <Button danger icon={<DisconnectOutlined />} onClick={handleBackendDisconnect} block>
                    Disconnect from Backend
                  </Button>
                </>
              )}
            </>
          )}
        </Flex>
      </Drawer>
    </>
  );
};
