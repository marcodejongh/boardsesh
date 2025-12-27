'use client';

import React from 'react';
import { Alert, Spin } from 'antd';
import { LoadingOutlined, DisconnectOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQueueContext } from '../graphql-queue';

interface ConnectionStatusBannerProps {
  compact?: boolean;
}

/**
 * Displays a banner when the WebSocket connection exists but isn't ready for actions.
 * Shows different states: connecting, error, or disconnected.
 */
export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({ compact = false }) => {
  const { sessionId, isConnecting, hasConnected, connectionError, isConnectionReady } = useQueueContext();

  // Don't show anything if:
  // - No session (local mode)
  // - Connection is ready
  if (!sessionId || isConnectionReady) {
    return null;
  }

  // Connecting state
  if (isConnecting) {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<Spin indicator={<LoadingOutlined spin />} size="small" />}
        message={compact ? 'Connecting...' : 'Connecting to session'}
        description={compact ? undefined : 'Queue changes will sync once connected'}
        style={{ marginBottom: compact ? 8 : 16 }}
      />
    );
  }

  // Error state
  if (connectionError) {
    return (
      <Alert
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message={compact ? 'Connection error' : 'Connection error'}
        description={compact ? undefined : connectionError.message || 'Unable to connect to session'}
        style={{ marginBottom: compact ? 8 : 16 }}
      />
    );
  }

  // Disconnected state (has session but not connected and not connecting)
  if (!hasConnected && !isConnecting) {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<DisconnectOutlined />}
        message={compact ? 'Disconnected' : 'Disconnected from session'}
        description={compact ? undefined : 'Attempting to reconnect...'}
        style={{ marginBottom: compact ? 8 : 16 }}
      />
    );
  }

  return null;
};

export default ConnectionStatusBanner;
