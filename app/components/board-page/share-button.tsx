'use client';

import React, { useState } from 'react';
import { TeamOutlined, CopyOutlined, UserOutlined, CrownFilled, LoadingOutlined } from '@ant-design/icons';
import { Button, Input, Drawer, QRCode, Flex, message, Avatar, Typography } from 'antd';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePeerContext } from '../connection-manager/peer-context';
import { usePartyContext } from '../party-manager/party-context';

const { Text } = Typography;

const getShareUrl = (pathname: string, searchParams: URLSearchParams, peerId: string) => {
  try {
    const params = new URLSearchParams(searchParams.toString());
    params.set('hostId', peerId);
    return `${window.location.origin}${pathname}?${params.toString()}`;
  } catch (e) {
    return '';
  }
};

type ConnectedUser = {
  username: string;
  avatar?: string;
  isHost?: boolean;
};

export const ShareBoardButton = () => {
  const { peerId, isConnecting, hasConnected } = usePeerContext();
  const { connectedUsers } = usePartyContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const showDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleClose = () => {
    setIsDrawerOpen(false);
  };

  const shareUrl = getShareUrl(pathname, searchParams, peerId || '');

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        message.success('Share URL copied to clipboard!');
        handleClose();
      })
      .catch(() => {
        message.error('Failed to copy URL.');
      });
  };

  return (
    <>
      <Button type="default" onClick={showDrawer} icon={!hasConnected && isConnecting ? <LoadingOutlined /> : <TeamOutlined />} />
      <Drawer
        title="Party Mode"
        placement="top"
        onClose={handleClose}
        open={isDrawerOpen}
        height="70vh"
      >
        <Flex gap="middle" vertical>
          {hasConnected && connectedUsers.length > 0 && (
            <Flex vertical gap="small">
              <Text strong>Connected Users:</Text>
              <Flex 
                vertical 
                gap="small"
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '4px'
                }}
              >
                {connectedUsers.map((user: ConnectedUser) => (
                  <Flex 
                    key={user.username}
                    justify="space-between"
                    align="center"
                    style={{
                      background: '#f5f5f5',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      width: '100%'
                    }}
                  >
                    <Flex gap="small" align="center">
                      <Avatar 
                        size="small"
                        icon={<UserOutlined />}
                        src={user.avatar}
                      />
                      <Text style={{ fontSize: '14px' }}>{user.username}</Text>
                    </Flex>
                    {user.isHost && (
                      <CrownFilled 
                        style={{ 
                          color: '#FFD700',
                          fontSize: '16px'
                        }} 
                      />
                    )}
                  </Flex>
                ))}
              </Flex>
            </Flex>
          )}
          
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
      </Drawer>
    </>
  );
};