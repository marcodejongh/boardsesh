'use client';

import React, { useState } from 'react';
import { TeamOutlined, CopyOutlined, CrownFilled, LoadingOutlined } from '@ant-design/icons';
import { Button, Input, Drawer, QRCode, Flex, message, Typography, Badge } from 'antd';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePeerContext } from '../connection-manager/peer-context';
import { usePartyContext } from '../party-manager/party-context';
// import { usePartyContext } from '../party-manager/party-context';

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

export const ShareBoardButton = () => {
  const { peerId, isConnecting, hasConnected, connections, hostId } = usePeerContext();
  const { connectedUsers, userName } = usePartyContext();

  // const { connectedUsers } = usePartyContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const showDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleClose = () => {
    setIsDrawerOpen(false);
  };

  const shareUrl = getShareUrl(pathname, searchParams, hostId || peerId || '');

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
      <Badge
        count={connections.length > 0 ? connections.length + 1 : connections.length}
        overflowCount={100}
        showZero={false}
        color="cyan"
      >
        <Button
          type="default"
          onClick={showDrawer}
          icon={!hasConnected && isConnecting ? <LoadingOutlined /> : <TeamOutlined />}
          disabled={!peerId}
        />
      </Badge>
      <Drawer title="Party Mode" placement="top" onClose={handleClose} open={isDrawerOpen} height="70vh">
        <Flex gap="middle" vertical>
          {connectedUsers.length > 0 && (
            <Flex vertical gap="small">
              <Text strong>Connected Users:</Text>
              <Flex
                vertical
                gap="small"
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '4px',
                }}
              >
                <Flex
                  key={peerId}
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
                    {/* <Avatar size="small" icon={<UserOutlined />} src={user.avatar} /> */}
                    <Text style={{ fontSize: '14px' }}>{userName} (you)</Text>
                  </Flex>
                  {/* {true === false && (
                      <CrownFilled
                        style={{
                          color: '#FFD700',
                          fontSize: '16px',
                        }}
                      />
                    )} */}
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
                      {/* <Avatar size="small" icon={<UserOutlined />} src={user.avatar} /> */}
                      <Text style={{ fontSize: '14px' }}>{conn.username || conn.id}</Text>
                    </Flex>
                    {conn.isHost && (
                      <CrownFilled
                        style={{
                          color: '#FFD700',
                          fontSize: '16px',
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
