'use client';

import React from 'react';
import { Alert, Spin } from 'antd';
import { LoadingOutlined, DisconnectOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQueueContext } from '../graphql-queue';
import styles from './connection-status-banner.module.css';

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

  const bannerClassName = compact ? styles.bannerCompact : styles.banner;

  // Connecting state
  if (isConnecting) {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<Spin indicator={<LoadingOutlined spin />} size="small" />}
        message={compact ? 'Connecting...' : 'Connecting to session'}
        description={compact ? undefined : 'Queue changes will sync once connected'}
        className={bannerClassName}
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
        className={bannerClassName}
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
        className={bannerClassName}
      />
    );
  }

  return null;
};

export default ConnectionStatusBanner;
