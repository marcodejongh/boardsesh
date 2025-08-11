'use client';

import React, { useState, useEffect } from 'react';
import { Spin, Typography } from 'antd';

const { Text } = Typography;

const loadingMessages = [
  "Setting up your board...",
  "Configuring climb routes...",
  "Preparing the wall...",
  "Loading hold sets...",
  "Almost ready to climb...",
  "Warming up the LEDs...",
  "Syncing board configuration...",
  "Calibrating difficulty grades...",
  "Getting your climbing groove on...",
  "Checking route conditions...",
];

interface FullPageLoadingOverlayProps {
  isVisible: boolean;
}

const FullPageLoadingOverlay: React.FC<FullPageLoadingOverlayProps> = ({ isVisible }) => {
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    if (!isVisible) return;

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setCurrentMessage(loadingMessages[messageIndex]);
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        gap: '24px',
      }}
    >
      <Spin size="large" />
      <Text
        style={{
          color: 'white',
          fontSize: '16px',
          textAlign: 'center',
          opacity: 0.9,
          maxWidth: '300px',
          lineHeight: 1.4,
        }}
      >
        {currentMessage}
      </Text>
    </div>
  );
};

export default FullPageLoadingOverlay;