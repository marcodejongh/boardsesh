'use client';

import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import { useQueueContext } from '../graphql-queue';
import styles from './queue-control-bar.module.css';

const statusCopy: Record<string, string> = {
  connecting: 'Connecting to party session…',
  reconnecting: 'Reconnecting…',
  stale: 'Connection lost – retrying…',
  error: 'Connection error – retrying…',
};

export function ConnectionBanner() {
  const { sessionId, connectionState = 'connected' } = useQueueContext();

  if (!sessionId) return null;
  if (connectionState === 'connected' || connectionState === 'idle') return null;

  const label = statusCopy[connectionState] || 'Reconnecting…';

  return (
    <Box className={styles.connectionBanner} data-testid="queue-connection-banner">
      {connectionState === 'error' ? (
        <ErrorOutlineOutlined fontSize="small" />
      ) : (
        <CircularProgress size={16} thickness={5} />
      )}
      <span>{label}</span>
    </Box>
  );
}
