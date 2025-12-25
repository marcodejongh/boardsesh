'use client';

import React, { useState } from 'react';
import { Button, Input, Typography, Flex, message, Alert } from 'antd';
import { CopyOutlined, LinkOutlined, GithubOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface BackendSetupPanelProps {
  onConnect: (url: string) => void;
  isConnecting: boolean;
  error: string | null;
  storedUrl: string | null;
}

export const BackendSetupPanel: React.FC<BackendSetupPanelProps> = ({
  onConnect,
  isConnecting,
  error,
  storedUrl,
}) => {
  const [inputUrl, setInputUrl] = useState(storedUrl || '');

  const dockerCommand = 'docker run -d -p 8080:8080 --name boardsesh-backend boardsesh/backend';

  const copyDockerCommand = () => {
    navigator.clipboard
      .writeText(dockerCommand)
      .then(() => message.success('Docker command copied!'))
      .catch(() => message.error('Failed to copy'));
  };

  const handleConnect = () => {
    if (!inputUrl.trim()) {
      message.error('Please enter a backend URL');
      return;
    }

    // Validate URL format
    try {
      const url = new URL(inputUrl);
      if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
        message.error('URL must start with ws:// or wss://');
        return;
      }
    } catch {
      message.error('Please enter a valid WebSocket URL (e.g., ws://192.168.1.100:8080)');
      return;
    }

    onConnect(inputUrl);
  };

  return (
    <Flex vertical gap="middle">
      <Alert
        type="info"
        showIcon
        message="Boardsesh Backend Required"
        description="To use Backend mode for more reliable connections, you need to run the Boardsesh backend on your local network."
      />

      <Flex vertical gap="small">
        <Text strong>Option 1: Run with Docker</Text>
        <Flex gap="small">
          <Input
            value={dockerCommand}
            readOnly
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
          <Button icon={<CopyOutlined />} onClick={copyDockerCommand} />
        </Flex>
      </Flex>

      <Flex vertical gap="small">
        <Text strong>Option 2: Download from GitHub</Text>
        <Button
          icon={<GithubOutlined />}
          href="https://github.com/boardsesh/backend/releases"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Releases
        </Button>
      </Flex>

      <Flex vertical gap="small" style={{ marginTop: '16px' }}>
        <Text strong>Connect to Backend</Text>
        <Paragraph type="secondary" style={{ margin: 0, fontSize: '12px' }}>
          Enter the WebSocket URL of your running backend. Find your computer&apos;s IP address and
          use port 8080.
        </Paragraph>
        <Flex gap="small">
          <Input
            placeholder="ws://192.168.1.x:8080"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onPressEnter={handleConnect}
            prefix={<LinkOutlined />}
            status={error ? 'error' : undefined}
          />
          <Button type="primary" onClick={handleConnect} loading={isConnecting}>
            Connect
          </Button>
        </Flex>
        {error && (
          <Text type="danger" style={{ fontSize: '12px' }}>
            {error}
          </Text>
        )}
      </Flex>
    </Flex>
  );
};
