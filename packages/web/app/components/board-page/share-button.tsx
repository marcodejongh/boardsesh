'use client';

import React, { useState } from 'react';
import {
  TeamOutlined,
  CopyOutlined,
  CrownFilled,
  LoadingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Button, Input, Drawer, QRCode, Flex, message, Typography, Badge } from 'antd';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePartyContext } from '../party-manager/party-context';
import { useBackendUrl } from '../connection-manager/connection-settings-context';
import { useQueueContext } from '../graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';

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
  const { users, clientId, isBackendMode, hasConnected, connectionError } = useQueueContext();
  const { connectedUsers, userName } = usePartyContext();
  const { backendUrl } = useBackendUrl();
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

          {/* Backend Mode Content */}
          {!isControllerMode && (
            <>
              {/* No backend configured */}
              {!isBackendMode && (
                <Flex
                  vertical
                  align="center"
                  gap="middle"
                  style={{
                    padding: '24px',
                    background: themeTokens.colors.warningBg,
                    border: `1px solid ${themeTokens.colors.warning}`,
                    borderRadius: themeTokens.borderRadius.md,
                  }}
                >
                  <Text strong style={{ color: themeTokens.colors.warning }}>
                    Party Mode Not Configured
                  </Text>
                  <Text type="secondary" style={{ textAlign: 'center' }}>
                    Set the NEXT_PUBLIC_WS_URL environment variable to your backend WebSocket URL and redeploy to
                    enable Party Mode.
                  </Text>
                </Flex>
              )}

              {/* Connecting */}
              {isConnecting && (
                <Flex vertical align="center" gap="middle" style={{ padding: '24px' }}>
                  <LoadingOutlined style={{ fontSize: '32px', color: themeTokens.colors.primary }} />
                  <Text>Connecting to backend...</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {backendUrl}
                  </Text>
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

              {/* Connected */}
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
                    <div>
                      <Text strong style={{ color: themeTokens.colors.success }}>
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
                              background:
                                user.id === currentUserId
                                  ? themeTokens.semantic.selected
                                  : themeTokens.neutral[100],
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
            </>
          )}
        </Flex>
      </Drawer>
    </>
  );
};
